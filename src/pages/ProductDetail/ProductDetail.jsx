import { useEffect, useState } from "react";
import style from "./ProductDetail.module.css";
import { ReactComponent as Logo } from "../../assets/addToCartIcon.svg";
import { useNavigate, useParams } from "react-router-dom";
import { getStorage, ref, getDownloadURL } from "firebase/storage";
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
  const storage = getStorage();
  console.log(comments);

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
      .then(async (querySnapshot) => {
        if (querySnapshot.empty) {
          console.log("評論為空");
          return;
        }
        const updataComments = await Promise.all(
          querySnapshot.docs.map(async (docSnap) => {
            const data = docSnap.data();

            if (data.userImg) {
              try {
                const imgRef = ref(storage, data.userImg);
                data.userImg = await getDownloadURL(imgRef);
              } catch (err) {
                console.log("頭像下載失敗");
                data.userImg = "/images/head_shot/userImg.png";
              }
            } else {
              data.userImg = "/images/head_shot/userImg.png";
            }
            return { id: docSnap.id, ...data };
          })
        );
        setComments(updataComments);
      })
      .catch((error) => {
        console.log("取得評論錯誤:", error);
      });
  }, [id,storage]);

  useEffect(() => {
    if (showMsg) {
      const timer = setTimeout(() => {
        setShowMsg(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [showMsg]);

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

  const handlePorductQuantity = (e) => {
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
      <div className="d-flex flex-column gap-5">
        <div className="bg-white p-3">
          <div className="d-flex">
            <img src={product.imageUrl} className={style.productImg} alt="productImg"/>
            <div className="p-3 ms-3 d-flex flex-column gap-4 flex-grow-1">
              <h3 className="fw-bold">{product.name}</h3>
              <div className={`${style.boxSpace} gap-2 fs-5 `}>
                <img
                  src={`/images/ratings/rating_${getStarIcon(
                    product.star
                  )}.png`}
                  className={style.ratingIcon}
                  alt="starIcon"
                />
                <span>{product.star}</span>
                <span>|</span>
                <span>{product.commentNum}則評論</span>
              </div>
              <div className={`${style.productPriceBox} ${style.boxSpace} p-3`}>
                <span className="text-danger fw-bold fs-2 me-3">
                  ${getDiscountPrice(product.discount, product.price)}
                </span>
                <span className="text-secondary fs-5 text-decoration-line-through">
                  ${product.price}
                </span>
              </div>
              <div className="px-2 d-flex flex-column gap-5">
                <div className={style.boxSpace}>
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
                    <button
                      className="bg-white border"
                      onClick={decreaseQuantity}
                    >
                      -
                    </button>

                    <input
                      type="text"
                      className={`${style.productQuantity} text-center border`}
                      onChange={handlePorductQuantity}
                      value={productQuantity}
                      maxLength="4"
                    />
                    <button
                      className="bg-white border"
                      onClick={increaseQuantity}
                    >
                      +
                    </button>
                  </div>
                  <span className="text-secondary">
                    還剩{product.inStock}件
                  </span>
                </div>
                <div className="">
                  <div className={style.boxSpace}>
                    <div className="me-5">
                      <button
                        className={style.addToCart}
                        onClick={handleAddToCart}
                      >
                        <Logo fill="#ffa042" className={style.addToCartIcon} />
                        加入購物車
                      </button>
                    </div>
                    <button className={style.buyNow} onClick={handleBuyNow}>
                      直接購買
                    </button>
                  </div>
                  <div
                    className={`${style.showMessage} ${
                      showMsg ? style.show : ""
                    } mt-3 d-flex align-items-center`}
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
          </div>
        </div>

        <div className="bg-white p-3">
          <div className={style.productInformationTitle}>
            <span className="fs-4 fw-bold">商品描述</span>
          </div>
          <div className={style.productInformation}>
            <p className="" style={{ whiteSpace: "pre-line" }}>
              {(product.describe ? product.describe : "無").replace(
                /\\r\\n/g,
                "\n"
              )}
            </p>
          </div>
        </div>

        <div className="bg-white p-3">
          <div className={style.productInformationTitle}>
            <span className="fs-4 fw-bold">評論</span>
          </div>
          <div className={style.productCommentContainer}>
            {comments.map((comment) => (
              <div key={comment.id}>
                <div className={style.productCommentContent}>
                  <img
                    src={comment.userImg}
                    className={`${style.commentUserImg} rounded-circle`}
                    alt="commentUserImg"
                  />
                  <article className="d-flex flex-column gap-1">
                    <span className="fs-5 fw-bold">{comment.userName}</span>
                    <img
                      src={`/images/ratings/rating_${getStarIcon(
                        comment.star
                      )}.png`}
                      className={style.commentRating}
                      alt="commentRating"
                    />
                    <div className="mt-2">
                      <div className="mb-2 text-secondary d-flex flex-row gap-2">
                        <div>
                          色差:
                          <span className="text-dark">
                            {comment.colorAccuracy}
                          </span>
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
                  </article>
                </div>
                <hr />
              </div>
            ))}

            {/*這裡放下一則留言 */}
          </div>
        </div>
      </div>
    </div>
  );
}
