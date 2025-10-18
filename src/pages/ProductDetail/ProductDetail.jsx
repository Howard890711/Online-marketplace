import { useEffect, useState } from "react";
import style from "./ProductDetail.module.css";
import { ReactComponent as Logo } from "../../assets/addToCartIcon.svg";
import { Modal, Button, Form } from "react-bootstrap";
import { useNavigate, useParams } from "react-router-dom";
import { db } from "../../utils/firebase";
import {
  getDoc,
  doc,
  collection,
  updateDoc,
  query,
  getDocs,
  setDoc,
  where,
} from "firebase/firestore";
import { useUser } from "../../UserContext";

export default function ProductDetail() {
  const { userData, setCartData } = useUser();
  const navigate = useNavigate();
  const { id } = useParams();
  const [productQuantity, setProductQuantity] = useState(1);
  const [product, setProduct] = useState([]);
  const [comments, setComments] = useState([]);
  const [showMsg, setShowMsg] = useState(false);
  const [isLoding, setIsLoding] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalBtnMsg, setModalBtnMsg] = useState("");

  useEffect(() => {
    const media = window.matchMedia("(max-width:767px)");
    setIsMobile(media.matches);

    const handleMobileChange = (event) => {
      setIsMobile(event.matches);
    };
    media.addEventListener("change", handleMobileChange);
    return () => {
      media.removeEventListener("change", handleMobileChange);
    };
  }, []);

  useEffect(() => {
    getDoc(doc(db, "products", id))
      .then((docSnap) => {
        if (docSnap.exists()) {
          setProduct(docSnap.data());
        } else {
          console.log("讀取錯誤");
        }
        setIsLoding(false);
      })
      .catch((error) => {
        console.log("讀取錯誤", error);
      });
  }, [id]);

  useEffect(() => {
    const commentsRef = collection(db, "products", id, "comments");
    getDocs(commentsRef)
      .then((querySnapshot) => {
        if (querySnapshot.empty) {
          console.log("評論為空");
          setComments([]);
          return;
        }
        const updataComments = querySnapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));
        setComments(updataComments);
      })
      .catch((error) => {
        console.log("取得評論錯誤:", error);
      });
  }, [id]);

  useEffect(() => {
    if (showMsg) {
      const timer = setTimeout(() => {
        setShowMsg(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [showMsg]);

  const handleShowModal = (BtnMsg) => {
    if (isMobile) {
      setShowModal(true);
      setModalBtnMsg(BtnMsg);
    } else {
      handleAddToCart();
    }
  };

  const handleConfirmBtn = () => {
    if (modalBtnMsg === "加入購物車") {
      handleAddToCart();
      setShowModal(false);
      return;
    } 
    if (modalBtnMsg === "直接購買") {
      handleBuyNow();
    }
  };

  const handleAddToCart = () => {
    if (!userData) {
      navigate("/LoginForm", { replace: true });
      return;
    }

    const cartCol = collection(db, "users", userData.uid, "shoppingCart");
    const searchCartOrder = query(cartCol, where("productId", "==", id));

    getDocs(searchCartOrder)
      .then((snapshot) => {
        if (!snapshot.empty) {
          const existCartOrder = snapshot.docs[0];
          const cartId = existCartOrder.id;
          const oldQuantity = existCartOrder.data().productQuantity || 0;
          const newQuantity = oldQuantity + (productQuantity || 1);
          setCartData((prev) =>
            prev.map((item) =>
              item.productId === id
                ? { ...item, productQuantity: newQuantity }
                : item
            )
          );
          const cartRef = doc(
            db,
            "users",
            userData.uid,
            "shoppingCart",
            cartId
          );
          return updateDoc(cartRef, { productQuantity: newQuantity });
        } else {
          const newRef = doc(cartCol);

          const newCartData = {
            cartId: newRef.id,
            productId: id,
            productQuantity: productQuantity || 1,
            productSubtotal: 0,
          };
          setCartData((prev) => [...prev, newCartData]);
          return setDoc(newRef, {
            cartId: newRef.id,
            productId: id,
            productQuantity: productQuantity || 1,
            productSubtotal: 0,
          });
        }
      })
      .then(() => {
        console.log("訂單新增完成");
        setShowMsg(true);
      })
      .catch((error) => {
        console.log("訂單新增失敗", error);
      });
  };

  const handleBuyNow = () => {
    const sendProduct = new Map([
      [id, { productId: id, productQuantity: productQuantity }],
    ]); //統一傳陣列
    navigate("/Checkout", { state: { productItems: Array.from(sendProduct) } });
  };

  const handleProductQuantity = (e) => {
    const onlyNum = e.target.value.replace(/\D/g, "");
    setProductQuantity(+onlyNum);
  };

  const increaseQuantity = () => {
    setProductQuantity((quantity) => +quantity + 1);
  };

  const decreaseQuantity = () => {
    if (productQuantity > 1) {
      setProductQuantity((quantity) => +quantity - 1);
    }
  };

  const getStarIcon = (score) => {
    const normalizedScore = Math.floor((score * 10) / 5) * 5;
    return normalizedScore;
  };

  const getDiscountPrice = (discount, price) => {
    return Math.floor(price * (discount > 10 ? discount / 100 : discount / 10));
  };

  if (isLoding) {
    return (
      <div className="text-center p-3">
        <div className="spinner-border text-warning" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={style.productDetailPage}>
      <div className={`flex-column flex-md-row ${style.productContent}`}>
        <img
          src={product.imageUrl}
          className={style.productImg}
          alt="productImg"
        />
        <div className="p-md-3 py-2 ms-md-3 d-none d-md-flex flex-column gap-4 flex-grow-1">
          <div className="d-flex flex-column gap-4">
            <h3 className="fw-bold">{product.name}</h3>

            <div className={`${style.boxSpace} gap-2 fs-5`}>
              <img
                src={`/images/ratings/rating_${getStarIcon(product.star)}.png`}
                className={style.ratingIcon}
                alt="starIcon"
              />
              <span>{product.star}</span>
              <span>|</span>
              <span>{product.commentNum}則評論</span>
            </div>

            {/* 價格 */}
            <div className={`${style.productPriceBox} ${style.boxSpace} p-3`}>
              <span className="text-danger fw-bold fs-2 me-3">
                ${getDiscountPrice(product.discount, product.price)}
              </span>
              <span className="text-secondary fs-5 text-decoration-line-through">
                ${product.price}
              </span>
            </div>
          </div>

          <div className="px-2 d-flex flex-column gap-5 ">
            <div className={style.boxSpace + " d-none d-md-flex"}>
              <span className="text-secondary me-5">折扣</span>
              <span
                className={`${style.productDiscount} px-3 py-1 rounded fw-bold`}
              >
                {product.discount}折
              </span>
            </div>

            <div className={style.boxSpace}>
              <span className="text-secondary me-5">數量</span>
              <div style={{ fontSize: "20px", marginRight: "30px" }}>
                <button className="bg-white border" onClick={decreaseQuantity}>
                  -
                </button>
                <input
                  type="text"
                  className={`${style.productQuantity} text-center border`}
                  onChange={handleProductQuantity}
                  value={productQuantity}
                  maxLength="4"
                />
                <button className="bg-white border" onClick={increaseQuantity}>
                  +
                </button>
              </div>
              <span className="text-secondary">還剩{product.inStock}件</span>
            </div>

            <div>
              <div className={style.boxSpace}>
                <button className={style.addToCart} onClick={handleAddToCart}>
                  <Logo className={style.addToCartIcon} />
                  加入購物車
                </button>
                <button className={style.buyNow} onClick={handleBuyNow}>
                  直接購買
                </button>
              </div>
              <div
                className={`${style.showMessage} ${
                  showMsg ? style.show : ""
                } mt-3  align-items-center d-none d-md-flex`}
              >
                <img
                  src="/images/icons/check.png"
                  className={style.checkIcon}
                  alt="checkIcon"
                />
                <div>已新增至購物車</div>
              </div>
            </div>
          </div>
        </div>
        <div className="p-md-3 py-2 ms-md-3 d-md-none d-flex flex-column gap-4 flex-grow-1">
          <div className="d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center">
              <span className="text-danger fw-bold fs-2 me-2">
                ${getDiscountPrice(product.discount, product.price)}
              </span>
              <span className="text-secondary fs-5 text-decoration-line-through">
                ${product.price}
              </span>
            </div>
            <span className="fw-bold">已售出{product.sold}</span>
          </div>
          <h3 className="fw-bold">{product.name}</h3>
        </div>
      </div>

      <div className="bg-white p-md-3 p-1">
        <div className={style.productInformationTitle}>
          <span className="fs-4 fw-bold">商品描述</span>
        </div>
        <div className={style.productInformation}>
          <p style={{ whiteSpace: "pre-line" }}>
            {product.describe ? product.describe : "無"}
          </p>
        </div>
      </div>
      <div className="bg-white p-md-3 p-1">
        <div className={style.productInformationTitle}>
          <span className="fs-4 fw-bold">評論</span>
        </div>
        <div className={style.productCommentContainer}>
          {comments.map((comment) => (
            <div key={comment.id}>
              <div className="d-flex align-items-start">
                <img
                  src={
                    comment.userImg
                      ? comment.userImg
                      : "/images/head_shot/userImg.png"
                  }
                  className={`${style.commentUserImg} rounded-circle me-2 d-none d-md-block`}
                  alt="commentUserImg"
                />
                <div className="d-flex flex-column gap-md-2 gap-1">
                  {/*手機版 */}
                  <div className="d-flex align-items-center d-md-none">
                    <img
                      src={
                        comment.userImg
                          ? comment.userImg
                          : "/images/head_shot/userImg.png"
                      }
                      className={`${style.commentUserImg} rounded-circle me-2`}
                      alt="commentUserImg"
                    />
                    <span style={{ lineHeight: 1 }}>{comment.userName}</span>
                  </div>

                  {/*桌面版 */}
                  <span className="d-none d-md-block" style={{ lineHeight: 1 }}>
                    {comment.userName}
                  </span>
                  <img
                    src={`/images/ratings/rating_${getStarIcon(
                      comment.star
                    )}.png`}
                    className={style.commentRating}
                    alt="commentRating"
                  />
                  <div className="text-secondary d-flex flex-md-row flex-column  gap-md-2 gap-1">
                    <div>
                      色差:
                      <span className="text-dark">{comment.colorAccuracy}</span>
                    </div>
                    <div>
                      品質:
                      <span className="text-dark">{comment.quality}</span>
                    </div>
                    <div>
                      和圖片相符:
                      <span className="text-dark">
                        {comment.matchWithPicture}
                      </span>
                    </div>
                  </div>
                  <blockquote style={{ whiteSpace: "pre-line" }}>
                    {comment.content}
                  </blockquote>
                </div>
              </div>
              <hr />
            </div>
          ))}
        </div>
      </div>
      <div className="fixed-bottom d-flex justify-content-center w-100 d-md-none">
        <button
          className="btn w-50 rounded-0 text-white"
          style={{ backgroundColor: "#5CADAD" }}
          onClick={() => handleShowModal("加入購物車")}
        >
          <Logo className={style.addToCartIcon} />
          加入購物車
        </button>
        <button
          className="btn w-50 rounded-0 text-white"
          style={{backgroundColor:"#ffa042"}}
          onClick={() => handleShowModal("直接購買")}
        >
          直接購買
        </button>
      </div>

      <Modal
        show={showModal}
        onHide={() => setShowModal(false)}
        dialogClassName={`${style.modalBottom} modal-sm modal-fullwidth`} // 關鍵：只靠這個控制位置/大小
        backdrop={true} // 如果不想要背景黑幕可以設 false
      >
        <Modal.Body>
          <div className="d-flex justify-content-between mb-3">
            <div>數量</div>
            <div className="d-flex align-items-center">
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={decreaseQuantity}
              >
                -
              </Button>
              <Form.Control
                type="number"
                defaultValue={1}
                className="text-center"
                style={{ width: "60px" }}
                size="sm"
                onChange={handleProductQuantity}
                value={productQuantity}
              />
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={increaseQuantity}
              >
                +
              </Button>
            </div>
          </div>
          <button
            variant="none"
            className={`${style.modalAddBtn} text-white border-0 rounded p-2 w-100`}
            size="lg"
            onClick={handleConfirmBtn}
          >
            {modalBtnMsg}
          </button>
        </Modal.Body>
      </Modal>
    </div>
  );
}
