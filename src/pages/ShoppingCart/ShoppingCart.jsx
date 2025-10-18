import { useEffect, useRef, useState } from "react";
import style from "./ShoppingCart.module.css";
import { useUser } from "../../UserContext";
import { db } from "../../utils/firebase";
import { deleteDoc, doc, getDoc, updateDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { Modal, Button } from "react-bootstrap";
import debounce from "lodash.debounce";
import {
  SwipeableList,
  SwipeableListItem,
  SwipeAction,
  TrailingActions,
} from "react-swipeable-list";
import "react-swipeable-list/dist/styles.css";

export default function ShoppingCart() {
  const navigate = useNavigate();
  const { setCartData, cartData, userData } = useUser();
  const [cartProduct, setCartProduct] = useState(new Map());
  const [selectItems, setSelectItems] = useState(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [isNull, setIsNull] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const cartProductRef = useRef(cartProduct);

  useEffect(() => {
    cartProductRef.current = cartProduct;
  }, [cartProduct]);

  useEffect(() => {
    if (Array.isArray(cartData) && cartData.length > 0) {
      const productPromises = cartData.map((item) => {
        const productRef = doc(db, "products", item.productId);
        return getDoc(productRef).then((productSnapshot) => {
          if (productSnapshot.exists()) {
            const discountPrice = handleDiscountPrice(
              productSnapshot.data().discount,
              productSnapshot.data().price
            );
            const subtotal = item.productQuantity * discountPrice;

            return [
              productSnapshot.id,
              {
                cartId: item.cartId,
                productId: productSnapshot.id,
                productQuantity: item.productQuantity,
                productSubtotal: subtotal,
                ...productSnapshot.data(),
              },
            ];
          } else {
            console.log("找不到該商品");
          }
        });
      });
      Promise.all(productPromises)
        .then((results) => {
          const filtered = results.filter(Boolean);
          const cartMap = new Map(filtered);
          setCartProduct(cartMap);
        })
        .finally(() => {
          setIsLoading(false);
          setIsNull(false);
        })
        .catch((error) => {
          console.log("處理商品錯誤:", error);
        });
    } else {
      setIsNull(true);
      setIsLoading(false);
    }
  }, [cartData]);

  const handleDiscountPrice = (discount, price) => {
    let discountRate;

    if (discount > 10) {
      discountRate = discount / 100;
    } else {
      discountRate = discount / 10;
    }
    return Math.floor(discountRate * price);
  };

  const isCheck = (productId) => {
    //判斷是否check
    return !!selectItems.has(productId);
  };

  const toggleSelect = (productId, productQuantity) => {
    setSelectItems((prev) => {
      const newMap = new Map(prev);
      newMap.has(productId)
        ? newMap.delete(productId)
        : newMap.set(productId, { productId, productQuantity });
      return newMap;
    });
  };

  const toggleSelectAll = () => {
    if (selectItems.size === cartProduct.size) {
      //若全有就全部拿掉
      setSelectItems(new Map());
    } else {
      setSelectItems(() => {
        const newMap = new Map();
        cartProduct.forEach((item) => {
          newMap.set(item.productId, {
            productId: item.productId,
            productQuantity: item.productQuantity,
          });
        });
        return newMap;
      }); //沒有就全部加入
    }
  };

  const total = Array.from(cartProduct)
    .filter(([productId, _]) => selectItems.has(productId))
    .reduce((sum, [_, productData]) => sum + productData.productSubtotal, 0);

  const handleDeleteProduct = (productId, cartId) => {
    const updated = new Map(cartProduct);
    updated.delete(productId);
    setCartProduct(updated);
    setCartData(Array.from(updated.values()));
    const newSelectItems = new Map(selectItems);
    newSelectItems.delete(productId);
    setSelectItems(newSelectItems);
    const cartRef = doc(db, "users", userData.uid, "shoppingCart", cartId);
    deleteDoc(cartRef)
      .then(() => {
        console.log("成功刪除");
      })
      .catch((error) => {
        console.log("刪除失敗:", error);
      });
  };

  const debounceUpdata = debounce((productId) => {
    const item = cartProductRef.current.get(productId);
    const quantity = item?.productQuantity;

    if (!quantity || quantity < 1) return;

    const cartItemRef = doc(
      db,
      "users",
      userData.uid,
      "shoppingCart",
      item.cartId
    );
    updateDoc(cartItemRef, {
      productQuantity: quantity,
    })
      .then(() => {
        console.log("數量同步成功");
      })
      .catch((error) => {
        console.log("同步失敗:", error);
      });
  }, 500);

  const handleUpdataQuantity = (productId, value, mode = "input") => {
    //更改為由productId當指引
    const updated = new Map(cartProduct);
    let quantity;

    if (mode === "input") {
      const cleaned = String(value).replace(/\D/g, "");
      quantity = cleaned === "" ? "" : Number(cleaned);
    } else if (mode === "blur") {
      quantity = Number(value);
      if (!quantity || quantity <= 0) quantity = 1;
    } else if (mode === "delta") {
      quantity = Number(updated.get(productId).productQuantity || 1) + value;
    }

    if (quantity !== "") {
      quantity = Math.max(1, Math.min(99, quantity));
    }

    const product = updated.get(productId);
    const { discount, price } = product;
    updated.set(productId, {
      ...product,
      productQuantity: quantity,
      productSubtotal: quantity * handleDiscountPrice(discount, price),
    });
    setCartProduct(updated);
    const select = new Map(selectItems);
    if (select.has(productId)) {
      select.set(productId, { productId, productQuantity: quantity });
      setSelectItems(select);
    }
  };

  const trailingActions = (productId, cartId) => (
    <TrailingActions>
      <SwipeAction
        destructive={true}
        onClick={() => handleDeleteProduct(productId, cartId)}
      >
        <div className="bg-danger text-nowrap text-white h-100 d-flex align-items-center justify-content-center px-3">
          刪除
        </div>
      </SwipeAction>
    </TrailingActions>
  );

  const handleCheckout = () => {
    //結帳Btn
    if (selectItems.size !== 0) {
      navigate("/Checkout", {
        state: { productItems: Array.from(selectItems) },
      });
    } else {
      setShowWarning(true);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center p-3">
        <div className="spinner-border text-warning" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (!isLoading && isNull) {
    return (
      <div className="text-center p-3">
        <p className="text-muted">購物車空了~~</p>
      </div>
    );
  }

  function QuantityInput({ productId, productData }) {
    return (
      <div>
        <button
          className={`${style.quantityBtn} bg-white text-secondary`}
          onClick={() => {
            handleUpdataQuantity(productId, -1, "delta");
            debounceUpdata(productId);
          }}
        >
          -
        </button>

        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          className={`${style.productQuantity} text-center border`}
          onChange={(e) =>
            handleUpdataQuantity(productId, e.target.value, "input")
          }
          value={productData.productQuantity}
          maxLength="2"
          onBlur={() => {
            handleUpdataQuantity(
              productId,
              productData.productQuantity,
              "blur"
            );
            debounceUpdata(productId);
          }}
        />
        <button
          className={`${style.quantityBtn} bg-white text-secondary`}
          onClick={() => {
            handleUpdataQuantity(productId, +1, "delta");
            debounceUpdata(productId);
          }}
        >
          +
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className={`${style.cartGrid} ${style.shoppingCartContainer}`}>
        <div className="bg-white p-4 rounded d-none d-md-flex flex-row">
          <label className="col-6">
            <input
              type="checkbox"
              className="me-3"
              checked={selectItems.size === cartProduct.size}
              onChange={toggleSelectAll}
            />
            商品
          </label>
          <span className={`${style.titleGrid} col`}>單價</span>
          <span className={`${style.titleGrid} col`}>數量</span>
          <span className={`${style.titleGrid} col`}>總計</span>
          <span className={`${style.titleGrid} col`}>操作</span>
        </div>
        {Array.from(cartProduct).map(([productId, productData]) => {
          return (
            <div key={productId}>
              <div
                className="bg-white p-4 rounded d-flex flex-row d-none d-md-flex"
              >
                <div className="col-6 d-flex align-items-center">
                  <label>
                    <input
                      type="checkbox"
                      className="me-3"
                      checked={isCheck(productData.productId)}
                      onChange={() =>
                        toggleSelect(productId, productData.productQuantity)
                      }
                    />
                  </label>
                  <img
                    src={productData.imageUrl}
                    className={`${style.productImg} rounded`}
                    alt="productImg"
                  />
                  <div className="align-self-start fw-bold ps-2">
                    <span className={style.productName}>
                      {productData.name}
                    </span>
                  </div>
                </div>

                <div className={`${style.contentGrid} col d-none d-md-flex`}>
                  <span className="text-secondary d-none d-md-block text-decoration-line-through me-2 originalPrice">
                    ${productData.price}
                  </span>
                  <span className="fw-bold discountPrice">
                    $
                    {handleDiscountPrice(
                      productData.discount,
                      productData.price
                    )}
                  </span>
                </div>
                <div className={`${style.contentGrid} col d-none d-md-flex`}>
                  <QuantityInput
                    productId={productId}
                    productData={productData}
                  />
                </div>
                <div className={`${style.contentGrid} col d-none d-md-flex`}>
                  <span className="text-danger fw-bold">
                    ${productData.productSubtotal}
                  </span>
                </div>
                <div className={`${style.contentGrid} col d-none d-md-flex`}>
                  <button
                    className={`${style.productDelete} border-0 bg-white`}
                    onClick={() =>
                      handleDeleteProduct(
                        productData.productId,
                        productData.cartId
                      )
                    }
                  >
                    刪除
                  </button>
                </div>
              </div>
              {/*手機版 */}
              <SwipeableList className="d-md-none">
                <SwipeableListItem
                  trailingActions={trailingActions(
                    productData.productId,
                    productData.cartId
                  )}
                >
                  <div className="bg-white p-2 rounded d-flex flex-row w-100">
                    <div className="col-4 d-flex align-items-center">
                      <label>
                        <input
                          type="checkbox"
                          className="me-3"
                          checked={isCheck(productData.productId)}
                          onChange={() =>
                            toggleSelect(productId, productData.productQuantity)
                          }
                        />
                      </label>
                      <img
                        src={productData.imageUrl}
                        className={`${style.productImg} rounded`}
                        alt="productImg"
                      />
                    </div>
                    <div className="d-flex flex-column justify-content-between w-100">
                      <div>
                        <div className="align-self-start fw-bold">
                          <span className={style.productName}>
                            {productData.name}
                          </span>
                        </div>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span className="fw-bold text-danger">
                          $
                          {handleDiscountPrice(
                            productData.discount,
                            productData.price
                          )}
                        </span>
                        <QuantityInput
                          productId={productId}
                          productData={productData}
                        />
                      </div>
                    </div>
                  </div>
                </SwipeableListItem>
              </SwipeableList>
            </div>
          );
        })}
      </div>

      <div className={style.checkoutBox}>
        <div className="shadow-lg flex-row bg-white rounded p-4 d-flex align-items-center justify-content-between w-100">
          <label>
            <input
              type="checkbox"
              className="me-3"
              checked={selectItems.size === cartProduct.size}
              onChange={toggleSelectAll}
            />
            全選
          </label>

          <div className="d-flex align-items-center">
            {showWarning && (
              <Modal show={showWarning} onHide={() => setShowWarning(false)}>
                <Modal.Header closeButton>
                  <Modal.Title>提示</Modal.Title>
                </Modal.Header>
                <Modal.Body>請先勾選商品再進行結帳</Modal.Body>
                <Modal.Footer>
                  <Button
                    style={{ backgroundColor: "#ffa042", border: "0" }}
                    onClick={() => setShowWarning(false)}
                  >
                    關閉
                  </Button>
                </Modal.Footer>
              </Modal>
            )}

            <div>
              總金額
              <span className="d-none d-md-inline">
                ({selectItems.size}個商品)
              </span>
              :<span className="text-danger fs-4">${total}</span>
            </div>
            <button
              className={`${style.checkoutBtn} btn fw-bold text-white ms-3`}
              style={{backgroundColor:"#ffa042"}}
              onClick={handleCheckout}
            >
              去買單
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
