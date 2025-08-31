import { useEffect, useState, useRef } from "react";
import "./index.css";
import { useUser } from "../../UserContext";
import { db } from "../../utils/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { Modal, Button, Form } from "react-bootstrap";
import { FaStar } from "react-icons/fa";
import { IoIosArrowBack, IoIosArrowForward } from "react-icons/io";
import { useNavigate } from "react-router-dom";
import swal from "sweetalert";

export default function ShoppingList() {
  const { userData, orderData } = useUser();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [orders, setOrders] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0); //觀察使用者評論到第幾個頁面
  const [selectOrder, setSelectOrder] = useState(null); //使用者選取的訂單
  const [commentData, setCommentData] = useState({}); //存取使用者評論
  const carouselRef = useRef(null); //負責綁定
  const carouselInstanceRef = useRef(null); //儲存綁定的實例
  const [searchKeyword, setSearchKeyword] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [searched,setSearched]=useState(false)
  const displayOrders = searched ? searchResults:orders;
  console.log(orders);


  useEffect(() => {
    setIsLoading(true);
    const updataOrder = {};
    const orderPromise = orderData.flatMap((order) => {
      const { orderId, orderSubtotal, orderDate, productItems } = order;
      return productItems.map((item) => {
        const productRef = doc(db, "products", item.productId);
        return getDoc(productRef).then((productSnapshot) => {
          if (!updataOrder[orderId]) {
            updataOrder[orderId] = {
              orderId,
              orderDate,
              orderSubtotal,
              products: [],
            };
          }
          if (productSnapshot.exists()) {
            updataOrder[orderId].products.push({
              //丟入該陣列
              productId: item.productId,
              productQuantity: item.productQuantity,
              productSubtotal: item.productSubtotal,
              ...productSnapshot.data(),
            });
          } else {
            console.log("找不到該訂單");
          }
        });
      });
    });
    Promise.all(orderPromise)
      .then(() => {
        setOrders(Object.values(updataOrder));
        setIsLoading(false);
      })
      .catch((error) => {
        console.log("訂單抓取失敗", error);
      });
  }, [orderData]);

  const handlePrev = () => {
    carouselInstanceRef.current?.prev();
  };

  const handleNext = () => {
    carouselInstanceRef.current?.next();
  };

  const handleSubmit = (e, productId) => {
    //評論完成Btn
    e.preventDefault();
    const data = commentData[productId];

    const commentRef = doc(
      db,
      "products",
      productId,
      "comments",
      `${userData.uid}_${productId}`
    );

    const comment = {
      userId: userData.uid,
      userName: userData.name,
      userImg: userData.userImg,
      ...data,
    };
    setDoc(commentRef, comment)
      .then(() => {
        swal({
          title: "評論成功",
          icon: "success",
          button: true,
          dangerMode: false,
        });
        handleCloseModal();
      })
      .catch((error) => {
        console.log("上傳失敗", error);
        swal({
          title: "評論失敗",
          icon: "error",
          button: "true",
          dangerMode: "true",
        });
      });
  };

  const handleBuyAgain = (order) => {
    const newMap = new Map();
    order.products.map((product) => {
      newMap.set(product.productId, {
        productId: product.productId,
        productQuantity: product.productQuantity,
      });
    });
    navigate("/Checkout", { state: { productItems: Array.from(newMap) } });
  };

  const initCommentData = (products) => {
    const initial = {};
    products.forEach((product) => {
      initial[product.productId] = {
        star: 0,
        hover: 0,
        quality: "",
        colorAccuracy: "",
        matchWithPicture: "",
        content: "",
      };
    });
    setCommentData(initial);
  };

  const handleShowModal = (order) => {
    console.log(order);
    setSelectOrder(order);
    initCommentData(order.products);
    setActiveIndex(0);
    setShowModal(true);
    setTimeout(() => {
      if (carouselRef.current) {
        carouselInstanceRef.current = new window.bootstrap.Carousel(
          carouselRef.current,
          {
            interval: false, //不輪播
            wrap: false, //不循環播放
          }
        );
        carouselRef.current.addEventListener("slid.bs.carousel", (e) => {
          setActiveIndex(e.to); //e.to為切幻燈片的index
        });
      }
    }, 100); // 等 Modal open 後再初始化
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectOrder(null);
    setCommentData({});
  };

  const handleInputChange = (productId, field, value) => {
    setCommentData((prev) => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [field]: value,
      },
    }));
  };

  const formDate = (date) => {
    return date.toDate().toLocaleString("zh-TW", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const searchOrder = (e) => {
    if (e.key === "Enter") {
      if (searchKeyword === "") {
        setSearchResults([]);
        return;
      }
      const lowerSearchKeyword = searchKeyword.toLowerCase();
      const filtered = orders.filter((order) => {
        const orderIdMatch = order.orderId
          .toLowerCase()
          .includes(lowerSearchKeyword);
        const productNameMatch = order.products.some((product) =>
          product.name.toLowerCase().includes(lowerSearchKeyword)
        );
        return orderIdMatch || productNameMatch;
      });
      setSearchResults(filtered);
      setSearched(true);
    }
  };

  return (
    <div className="shoppingListPage">
      <h2 className="ms-4">歷史訂單</h2>
      <div className="historySearchBox bg-light mb-3">
        <img
          className="historySearchIcon"
          alt="searchIcon"
          src="/images/icons/searchIcon.png"
        />
        <input
          className="bg-light w-100 border-0 ps-5 p-3 "
          type="search"
          placeholder="您可以透過商品名稱或訂單編號搜尋"
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          onKeyDown={searchOrder}
        />
      </div>
      {isLoading ? (
        <div className="text-center p-3">
          <div className="spinner-border text-warning" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : searched && searchResults.length === 0 ? (
        <div className="text-center p-3 text-secondary">
          未找到符合條件的的訂單
        </div>
      ) : (
        displayOrders.map((order) => (
          <div className="orderBox mb-3" key={order.orderId}>
            {/*一筆訂單*/}

            <div className="productListBox border ">
              {/*一個產品 */}
              {order.products.map((product) => {
                return (
                  <div
                    className="productBox d-flex p-3 shadow-sm"
                    key={product.productId}
                  >
                    <img
                      src={product.imageUrl}
                      className="productImg border"
                      alt="productImg"
                    />
                    <div className="ms-3 d-flex flex-column gap-4 w-100">
                      <div className="productName">
                        <h5>{product.name}</h5>
                      </div>
                      <div className="d-flex justify-content-between align-items-center">
                        <span className="">x{product.productQuantity}</span>
                        <span className="fs-5 fw-bold text-danger">
                          ${product.productSubtotal}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="orderInfo p-3">
              <div className="text-end mb-3">
                <span className="text-secondary">訂單金額：</span>
                <span className="text-danger fw-bold fs-5">
                  ${order.orderSubtotal}
                </span>
              </div>

              <div className="d-flex justify-content-between">
                <div className="d-flex flex-column gap-2">
                  <span className="fw-bold">訂單編號:{order.orderId}</span>
                  <span className="fw-bold text-danger">
                    訂單時間:{formDate(order.orderDate)}
                  </span>
                </div>
                <div className="d-flex">
                  <button
                    className="text-white px-4 fw-bold rounded buyAgainBtn"
                    onClick={() => handleBuyAgain(order)}
                  >
                    再買一次
                  </button>
                  <button
                    className="ms-3 px-4 fw-bold commentBtn rounded"
                    onClick={() => handleShowModal(order)}
                  >
                    買家評論
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))
      )}

      {selectOrder && (
        <Modal show={showModal} onHide={handleCloseModal}>
          <Modal.Header>
            <div className="w-100 d-flex justify-content-between align-items-center">
              <Modal.Title>買家評論</Modal.Title>
              <div className="d-flex align-items-center">
                <button
                  className="border-0 bg-white"
                  type="button"
                  data-bs-target="#carouselControl"
                  data-bs-slide="prev"
                  onClick={handlePrev}
                >
                  <IoIosArrowBack
                    size={24}
                    color="#ffa042"
                    aria-hidden="true"
                  />
                  <span className="visually-hidden">Previous</span>
                </button>
                <div className="d-flex">
                  <span>{activeIndex + 1}</span>/
                  <span>{selectOrder?.products.length}</span>
                </div>
                <button
                  className="border-0 bg-white"
                  type="button"
                  data-bs-target="#carouselControl"
                  data-bs-slide="next"
                  onClick={handleNext}
                >
                  <IoIosArrowForward
                    size={24}
                    color="#ffa042"
                    aria-hidden="true"
                  />
                  <span className="visually-hidden">Next</span>
                </button>
              </div>
            </div>
          </Modal.Header>
          <Modal.Body>
            <div
              id="carouselControl"
              className="carousel slide"
              ref={carouselRef}
            >
              <div className="carousel-inner">
                {selectOrder?.products.map((product, index) => (
                  <div
                    className={`carousel-item ${index === 0 ? "active" : ""}`}
                    key={index}
                  >
                    <div className="d-flex mb-3">
                      <img
                        src={product.imageUrl}
                        style={{ height: "80px", width: "80px" }}
                        className="border me-2"
                        alt="ModalProductImg"
                      />
                      <span className="fw-bold fs-5">{product.name}</span>
                    </div>

                    <Form onSubmit={(e) => handleSubmit(e, product.productId)}>
                      <Form.Group
                        className="mb-3 row align-items-center"
                        controlId="formRating"
                      >
                        <Form.Label className="col-sm-3 col-form-label text-start">
                          商品品質
                        </Form.Label>
                        <div className="col-sm-9">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <FaStar
                              key={star}
                              size={25}
                              onClick={() => {
                                handleInputChange(
                                  product.productId,
                                  "star",
                                  star
                                );
                              }}
                              onMouseEnter={() =>
                                handleInputChange(
                                  product.productId,
                                  "hover",
                                  star
                                )
                              }
                              onMouseLeave={() =>
                                handleInputChange(product.productId, "hover", 0)
                              }
                              color={
                                (commentData[product.productId].hover ||
                                  commentData[product.productId].star ||
                                  0) >= star
                                  ? "#ffa042"
                                  : "#ccc"
                              }
                              style={{ cursor: "pointer" }}
                            />
                          ))}
                        </div>
                      </Form.Group>

                      <Form.Group className="mb-3 row" controlId="quality">
                        <Form.Label className="col-sm-3 col-form-label text-start">
                          品質
                        </Form.Label>
                        <div className="col-sm-9">
                          <Form.Select
                            value={commentData[product.productId].quality}
                            onChange={(e) =>
                              handleInputChange(
                                product.productId,
                                "quality",
                                e.target.value
                              )
                            }
                          >
                            <option value="無">請選擇</option>
                            <option value="優良">優良</option>
                            <option value="良好">良好</option>
                            <option value="普通">普通</option>
                            <option value="略差">略差</option>
                            <option value="差">差</option>
                          </Form.Select>
                        </div>
                      </Form.Group>

                      <Form.Group
                        className="mb-3 row"
                        controlId="colorAccuracy"
                      >
                        <Form.Label className="col-sm-3 col-form-label text-start">
                          色差
                        </Form.Label>
                        <div className="col-sm-9">
                          <Form.Select
                            value={commentData[product.productId].colorAccuracy}
                            onChange={(e) =>
                              handleInputChange(
                                product.productId,
                                "colorAccuracy",
                                e.target.value
                              )
                            }
                          >
                            <option value="無">請選擇</option>
                            <option value="有明顯色差">有明顯色差</option>
                            <option value="略有色差">略有色差</option>
                            <option value="無色差">無色差</option>
                          </Form.Select>
                        </div>
                      </Form.Group>

                      <Form.Group
                        className="mb-3 row"
                        controlId="matchWithPicture"
                      >
                        <Form.Label className="col-sm-3 col-form-label text-start">
                          和圖片相符
                        </Form.Label>
                        <div className="col-sm-9">
                          <Form.Select
                            value={
                              commentData[product.productId].matchWithPicture
                            }
                            onChange={(e) => {
                              handleInputChange(
                                product.productId,
                                "matchWithPicture",
                                e.target.value
                              );
                            }}
                          >
                            <option value="無">請選擇</option>
                            <option value="相符">相符</option>
                            <option value="略有差異">略有差異</option>
                            <option value="不相符">不相符</option>
                          </Form.Select>
                        </div>
                      </Form.Group>

                      <div
                        className="p-3"
                        style={{ backgroundColor: "#e9ecef" }}
                      >
                        <Form.Group className="mb-3" controlId="formComment">
                          <Form.Label>留言內容</Form.Label>
                          <Form.Control
                            as="textarea"
                            rows={3}
                            value={commentData[product.productId].content}
                            onChange={(e) => {
                              handleInputChange(
                                product.productId,
                                "content",
                                e.target.value
                              );
                            }}
                          />
                        </Form.Group>
                      </div>
                      <div className="d-flex mt-3 justify-content-end">
                        <div className="d-flex">
                          <Button
                            className="bg-white text-dark border-0 px-4"
                            onClick={handleCloseModal}
                          >
                            關閉
                          </Button>
                          <Button
                            style={{ backgroundColor: "#ffa042" }}
                            className="border-0 px-4"
                            type="submit"
                          >
                            完成
                          </Button>
                        </div>
                      </div>
                    </Form>
                  </div>
                ))}
              </div>
            </div>
          </Modal.Body>
        </Modal>
      )}
    </div>
  );
}
