import { useEffect, useRef, useState } from "react";
import style from "./ShoppingCart.module.css";
import { useUser } from "../../UserContext";
import { db } from "../../utils/firebase";
import { deleteDoc, doc, getDoc, updateDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { Modal, Button } from "react-bootstrap";
import debounce from "lodash.debounce";

export default function ShoppingCart() {
  const navigate = useNavigate();
  const { setCartData, cartData, userData } = useUser();
  const [cartProduct, setCartProduct] = useState(new Map());
  const [selectItems, setSelectItems] = useState(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [isNull,setIsNull]=useState(false)
  const [showWarning, setShowWarning] = useState(false);
  const cartProductRef=useRef(cartProduct)

  useEffect(()=>{
    cartProductRef.current=cartProduct
  },[cartProduct])

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
          setIsNull(false)
        })
        .catch((error) => {
          console.log("處理商品錯誤:", error);
        });
    }
    else{
      setIsNull(true)
      setIsLoading(false)
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
    setCartData(Array.from(updated.values()))
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

  if(!isLoading && isNull){
    return(
    <div className="text-center p-3">
      <p className="text-muted">購物車空了~~</p>
    </div>)
  }

  return (
    <div className={style.shoppingCartPage}>
      <div className={`${style.cartGrid} ${style.shoppingCartContainer}`}>
        <div className="bg-white p-4 rounded row">
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
            <div className="bg-white p-4 rounded row" key={productId}>
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
                <img src={productData.imageUrl} className={style.productImg} />
                <div className="align-self-start p-2 fw-bold ms-2">
                  <div className={style.productName}>{productData.name}</div>
                </div>
              </div>
              <div className={`${style.contentGrid} col`}>
                <span className="text-secondary text-decoration-line-through me-2 originalPrice">
                  ${productData.price}
                </span>
                <span className="fw-bold discountPrice">
                  $
                  {handleDiscountPrice(productData.discount, productData.price)}
                </span>
              </div>
              <div className={`${style.contentGrid} col`}>
                <div>
                  <button
                    className="bg-white border"
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
                    onBlur={() =>{
                      handleUpdataQuantity(
                        productId,
                        productData.productQuantity,
                        "blur"
                      );
                    debounceUpdata(productId)}
                    }
                  />
                  <button
                    className="bg-white border"
                    onClick={() => {
                      handleUpdataQuantity(productId, +1, "delta");
                      debounceUpdata(productId);
                    }}
                  >
                    +
                  </button>
                </div>
              </div>
              <div className={`${style.contentGrid} col`}>
                <span className="text-danger fw-bold">
                  ${productData.productSubtotal}
                </span>
              </div>
              <div className={`${style.contentGrid} col`}>
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
          );
        })}
      </div>

      <div className={`${style.checkoutBox}`}>
        <div className={style.checkout}>
          <div className="shadow-lg row bg-white rounded p-4 d-flex align-items-center">
            <label className="col-6">
              <input
                type="checkbox"
                className="me-3"
                checked={selectItems.size === cartProduct.size}
                onChange={toggleSelectAll}
              />
              全選
            </label>

            <div className="col-6 d-flex align-items-center justify-content-end">
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

              <div className="text-end">
                總金額<span>({selectItems.size}個商品):</span>
                <span className="text-danger fs-4">${total}</span>
              </div>
              <button
                className="btn btn-danger btn-lg text-white ms-5"
                onClick={handleCheckout}
              >
                去買單
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
