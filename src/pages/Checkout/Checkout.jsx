import { Fragment, useEffect, useMemo, useState } from "react";
import style from "./Checkout.module.css";
import { useLocation, useNavigate } from "react-router-dom";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import { useUser } from "../../UserContext";
import { db } from "../../utils/firebase";
import { Modal } from "react-bootstrap";

export default function Checkout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { userData, setOrderData } = useUser();
  const { productItems } = location.state || {};
  const [products, setProducts] = useState(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [showShippingModal, setShowShippingModal] = useState(false);
  const [showPaymethodModal, setShowPaymethodModal] = useState(false);

  const mobilePay = ["Line Pay", "Apple Pay", "Google Pay", "街口支付"];
  const recipientOptions = [
    { label: "店到店取貨", value: "storePickup", price: 45 },
    { label: "超商取貨", value: "convenienceStore", price: 60 },
    { label: "宅配到府", value: "homeDelivery", price: 100 },
  ];
  const paymentMethodOptions = [
    {
      label: "信用卡付款",
      value: "creditCard",
      img: "/images/icons/creditCard.png",
    },
    {
      label: "行動支付",
      value: "mobilePayment",
      img: "/images/icons/mobilePayment.png",
    },
    { label: "ATM轉帳", value: "atmTransfer", img: "/images/icons/ATM.png" },
    {
      label: "貨到付款",
      value: "cashOnDelivery",
      img: "/images/icons/cash.png",
    },
  ];
  const [formData, setFormData] = useState({
    recipientData: {
      pickupMethod: recipientOptions[0],
      name: "",
      phoneNumber: "",
      address: "",
      note: "",
    },

    paymentMethodData: {
      paymentMethod: paymentMethodOptions[3],
      //信用卡欄位
      cardNumber: "",
      cardExpiryMonth: "",
      cardExpiryYear: "",
      cardCVV: "",
      //行動支付欄位
      mobilePay: "",
    },
  });

  const [mobileFormData, setMobileFormData] = useState(formData); //手機版暫存formData

  useEffect(() => {
    if (!productItems || productItems.length === 0) {
      return navigate("/");
    }
  }, [productItems, navigate]);

  const productsTotal = Array.from(products).reduce(
    //算商品小計
    (sum, [_, item]) => sum + item.productSubtotal,
    0
  );

  const orderTotal = useMemo(() => {
    //算總額
    return productsTotal + formData.recipientData.pickupMethod.price;
  }, [productsTotal,formData.recipientData.pickupMethod]);

  useEffect(() => {
    const updataOrder = new Map();
    const orderPromise = productItems?.map(([productId, productData]) => {
      const productRef = doc(db, "products", productId);
      return getDoc(productRef).then((productSnapshot) => {
        if (productSnapshot.exists()) {
          const data = productSnapshot.data();

          const discountPrice = handleDiscountPrice(data.discount, data.price);

          const subtotal = productData.productQuantity * discountPrice;

          updataOrder.set(productId, {
            productId,
            productQuantity: productData.productQuantity,
            productSubtotal: subtotal,
            ...data,
          });
        } else {
          console.log("找不到訂單");
        }
      });
    });
    Promise.all(orderPromise)
      .then(() => {
        setProducts(updataOrder);
      })
      .catch((error) => {
        console.log("訂單抓取失敗", error);
      });
  }, [productItems]);

  const handleDiscountPrice = (discount, price) => {
    let discountRate;

    if (discount > 10) {
      discountRate = discount / 100;
    } else {
      discountRate = discount / 10;
    }
    return Math.floor(discountRate * price);
  };

  const handleInputChange = (setter) => (e) => {
    const { name, value, dataset } = e.target;

    setter((prev) => {
      if (dataset.group === "recipientData") {
        if (name === "phoneNumber" && !/^\d*$/.test(value)) return prev; //檢查phoneNumber
        if (name === "pickupMethod") {
          const updatedPickup = recipientOptions.find(
            (opt) => opt.value === value
          );
          return {
            ...prev,
            recipientData: {
              ...prev.recipientData,
              pickupMethod: updatedPickup,
            },
          };
        } else {
          return {
            ...prev,
            recipientData: {
              ...prev.recipientData,
              [name]: value,
            },
          };
        }
      }

      if (dataset.group === "paymentMethodData") {
        if (
          (name === "cardNumber" || name === "cardCVV") &&
          !/^\d*$/.test(value) &&
          value !== ""
        )
          return prev;
        if (name === "paymentMethod") {
          const updatedPayment = paymentMethodOptions.find(
            (pay) => pay.value === value
          );
          return {
            ...prev,
            paymentMethodData: {
              ...prev.paymentMethodData,
              paymentMethod: updatedPayment,
            },
          };
        } else {
          return {
            ...prev,
            paymentMethodData: {
              ...prev.paymentMethodData,
              [name]: value,
            },
          };
        }
      }

      return prev;
    });
  };

  const handleMobileConfirmShipping = () => {
    //手機版暫存丟入Data
    setFormData((prev) => ({
      ...prev,
      recipientData: { ...mobileFormData.recipientData },
    }));
    setShowShippingModal(false);
  };

  const handleMobileConfirmPaymethod = () => {
    setFormData((prev) => ({
      ...prev,
      paymentMethodData: { ...mobileFormData.paymentMethodData },
    }));
    setShowPaymethodModal(false);
  };

  const handleMobilePaySelect = (paySelect) => {
    //變更行動支付
    setFormData((prev) => ({
      ...prev,
      paymentMethodData: {
        ...prev.paymentMethodData,
        mobilePay: paySelect,
      },
    }));
  };

  const handleOrderClick = (e) => {
    e.preventDefault();
    setIsLoading(true);

    if (e.currentTarget.tagName === "FORM") {
      //電腦版form中才需要判斷不然錯誤
      if (!e.currentTarget.checkValidity()) {
        e.stopPropagation();
        e.currentTarget.classList.add("was-validated");
        setIsLoading(false);
        return;
      }
    }
    const orderDate = Timestamp.fromDate(new Date());
    const productArray = Array.from(products).map(
      ([productId, productData]) => ({
        productId,
        productQuantity: productData.productQuantity,
        productSubtotal: productData.productSubtotal,
      })
    );
    const data = {
      orderDate: orderDate,
      orderSubtotal: productsTotal,
      productItems: productArray || [],
      recipientData: formData.recipientData,
      paymentMethodData: formData.paymentMethodData,
      orderTotal: orderTotal,
    };
    addDoc(collection(db, "users", userData.uid, "orders"), data)
      .then((docRef) => {
        const orderId = docRef.id;
        const orderDocRef = doc(db, "users", userData.uid, "orders", orderId); //拿到orderID後再丟入
        const newOrderData = { ...data, orderId }; //準備設定orderData的
        setOrderData((prev) =>
          Array.isArray(prev) ? [...prev, newOrderData] : [newOrderData]
        );
        return updateDoc(orderDocRef, {
          orderId: orderId,
        });
      })
      .then(() => {
        console.log("訂單新增成功");
        setIsLoading(false);
        navigate("/Profile/ShoppingHistory",{replace:true});
      })
      .catch((error) => {
        console.error("訂單新增失敗", error);
        setIsLoading(false);
      });
  };

  useEffect(() => {
    if (
      formData.paymentMethodData.paymentMethod === "mobilePayment" &&
      !formData.paymentMethodData.mobilePay
    ) {
      setFormData((prev) => ({
        ...prev,
        paymentMethodData: {
          ...prev.paymentMethodData,
          mobilePay: "Line Pay", // 設定預設行動支付方式
        },
      }));
    }
  }, [
    formData.paymentMethodData.mobilePay,
    formData.paymentMethodData.paymentMethod,
  ]);

  return (
    <div className={style.checkoutPage}>
      <div className={`${style.titleBox} rounded shadow-sm d-none d-md-block`}>
        <div className="row">
          <h4 className="col-6">訂單商品</h4>
          <p className="col-2 text-end">價錢</p>
          <p className="col-2 text-end">數量</p>
          <p className="col-2 text-end">總價</p>
        </div>
      </div>

      <div className={`${style.productListBox} rounded shadow-sm mb-1`}>
        {Array.from(products).map(([productId, item]) => {
          const {
            productQuantity,
            imageUrl,
            name,
            discount,
            price,
            productSubtotal,
          } = item;
          return (
            <Fragment key={productId}>
              <div className="row d-flex align-items-center mb-3 d-none d-md-flex">
                <div className="col-6 d-flex align-items-center">
                  <img
                    src={imageUrl}
                    className={`${style.productImg} rounded`}
                    alt="productImg"
                  />
                  <h5 className={style.productName}>{name}</h5>
                </div>
                <div className="col-2 text-end">
                  <span>${handleDiscountPrice(discount, price)}</span>
                </div>
                <div className="col-2 text-end">
                  <span>x{productQuantity}</span>
                </div>
                <div className="col-2 text-end text-danger fw-bold">
                  <span>${productSubtotal}</span>
                </div>
              </div>
              {/*手機版排版 */}
              <div className="row d-flex mb-1 d-md-none">
                <div className="col-3 d-flex align-items-center">
                  <img
                    src={imageUrl}
                    className={`${style.productImg} rounded`}
                    alt="productImg"
                  />
                </div>
                <div className="col-9 d-flex flex-column justify-content-between">
                  <span className={style.productName}>{name}</span>
                  <div className="d-flex justify-content-between">
                    <span className="text-danger">
                      ${handleDiscountPrice(discount, price)}
                    </span>
                    <span>x{productQuantity}</span>
                  </div>
                </div>
              </div>
            </Fragment>
          );
        })}
      </div>

      <form
        onSubmit={handleOrderClick}
        className="needs-validation d-none d-md-block"
        noValidate
      >
        <div
          className={`${style.recipienBox} shadow-sm rounded d-flex flex-column gap-5 mb-1`}
        >
          <div>
            <h4>寄送資訊</h4>
            <div className="d-flex gap-5 mt-4">
              {recipientOptions.map((option) => {
                return (
                  <label key={option.value}>
                    <input
                      type="radio"
                      className="me-2"
                      name="pickupMethod"
                      value={option.value}
                      checked={
                        formData.recipientData.pickupMethod.value ===
                        option.value
                      }
                      onChange={handleInputChange(setFormData)}
                      data-group="recipientData"
                    />
                    {option.label}${option.price}
                  </label>
                );
              })}
            </div>
          </div>
          <div className="row">
            <div className="col-4">
              <label htmlFor="name" className="form-label">
                收件人
              </label>
              <input
                type="text"
                placeholder="請輸入收人姓名"
                id="name"
                className="form-control"
                name="name"
                value={formData.recipientData.name}
                onChange={handleInputChange(setFormData)}
                data-group="recipientData"
                required
              />
              <div className="invalid-feedback">必填</div>
            </div>
            <div className="col-4">
              <label htmlFor="phoneNumber" className="form-label">
                手機
              </label>
              <input
                type="text"
                placeholder="請輸入手機號碼"
                id="phoneNumber"
                className="form-control"
                name="phoneNumber"
                maxLength={10}
                value={formData.recipientData.phoneNumber}
                onChange={handleInputChange(setFormData)}
                data-group="recipientData"
                required
              />
              <div className="invalid-feedback">必填</div>
            </div>
            <div className="col-4">
              <label htmlFor="address" className="form-label">
                寄送地址
              </label>
              <input
                type="text"
                placeholder="請輸入到府地址/超商門市/店到店門市"
                id="address"
                className="form-control"
                name="address"
                value={formData.recipientData.address}
                onChange={handleInputChange(setFormData)}
                data-group="recipientData"
                required
              />
              <div className="invalid-feedback">必填</div>
            </div>
          </div>
          <div className="col">
            <label htmlFor="note" className="form-label">
              備註
            </label>
            <input
              type="text"
              placeholder="管理室代收/電話聯絡時間等..."
              name="note"
              id="note"
              className="form-control"
              value={formData.recipientData.note}
              onChange={handleInputChange(setFormData)}
              data-group="recipientData"
            />
          </div>
        </div>
        <div className={`${style.paymentMethodBox} shadow-sm rounded mb-1`}>
          <h4>付款方式</h4>
          <div className="d-flex gap-5 my-4">
            {paymentMethodOptions.map((option) => {
              return (
                <div key={option.value}>
                  <label className="fs-5">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={option.value}
                      className="me-2"
                      checked={
                        formData.paymentMethodData.paymentMethod.value ===
                        option.value
                      }
                      onChange={handleInputChange(setFormData)}
                      data-group="paymentMethodData"
                    />
                    {option.label}
                  </label>
                </div>
              );
            })}
          </div>
          {formData.paymentMethodData.paymentMethod.value === "creditCard" && (
            <div className="row">
              {/*信用卡 */}
              <div className="col">
                <label className="form-label" htmlFor="cardNumber">
                  卡號
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="請輸入信用卡卡號"
                  id="cardNumber"
                  maxLength={16}
                  name="cardNumber"
                  onChange={handleInputChange(setFormData)}
                  value={formData.paymentMethodData.cardNumber}
                  data-group="paymentMethodData"
                  required
                />
                <div className="invalid-feedback">必填</div>
              </div>
              <div className="col">
                <label className="form-label" htmlFor="cardExpiry">
                  有效期限
                </label>
                <div className="d-flex gap-3">
                  <select
                    className="form-select"
                    name="cardExpiryMonth"
                    value={formData.paymentMethodData.cardExpiryMonth}
                    onChange={handleInputChange(setFormData)}
                    data-group="paymentMethodData"
                    required
                  >
                    <option value="">MM</option>
                    {Array.from({ length: 12 }, (_, i) => {
                      const month = (i + 1).toString().padStart(2, "0");
                      return (
                        <option key={month} value={month}>
                          {month}
                        </option>
                      );
                    })}
                  </select>
                  <div className="invalid-feedback">必填</div>
                  <span className="d-flex align-items-center">/</span>
                  <select
                    className="form-select"
                    name="cardExpiryYear"
                    value={formData.paymentMethodData.cardExpiryYear}
                    onChange={handleInputChange(setFormData)}
                    data-group="paymentMethodData"
                    required
                  >
                    <option value="">YY</option>
                    {Array.from({ length: 6 }, (_, i) => {
                      const year = new Date().getFullYear() + i;
                      return (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      );
                    })}
                  </select>
                  <div className="invalid-feedback">必填</div>
                </div>
              </div>
              <div className="col">
                <label className="form-label" htmlFor="cardCVV">
                  安全碼
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="CVV"
                  maxLength={3}
                  minLength={3}
                  name="cardCVV"
                  onChange={handleInputChange(setFormData)}
                  value={formData.paymentMethodData.cardCVV}
                  data-group="paymentMethodData"
                  required
                />
                <div className="invalid-feedback">必填</div>
              </div>
            </div>
          )}

          {formData.paymentMethodData.paymentMethod.value ===
            "mobilePayment" && (
            <div className="d-flex gap-3">
              {/*行動支付 */}
              {mobilePay.map((pay) => {
                return (
                  <button
                    key={pay}
                    className={`p-2 bg-white border ${
                      formData.paymentMethodData.mobilePay === pay
                        ? "border-danger text-danger"
                        : ""
                    }`}
                    type="button"
                    onClick={() => handleMobilePaySelect(pay)}
                  >
                    {pay}
                  </button>
                );
              })}
            </div>
          )}
          {formData.paymentMethodData.paymentMethod.value === "atmTransfer" && (
            <div className="d-flex gap-5">
              {/*ATM轉帳 */}
              <div className="d-flex flex-column gap-2">
                <h5 className="fw-bold">銀行名稱</h5>
                <div className="fs-5">中華郵政(700)</div>
              </div>
              <div className="d-flex flex-column gap-2">
                <h5 className="fw-bold">帳號</h5>
                <div className="fs-5"> 00717482660264</div>
              </div>
              <div className="bg-warning bg-opacity-25 rounded d-flex align-items-center p-2">
                <div className="text-danger fw-bold fs-5">
                  請於 3 日內完成匯款，並保留轉帳憑證！
                </div>
              </div>
            </div>
          )}
          {formData.paymentMethodData.paymentMethod.value ===
            "cashOnDelivery" && (
            <div className="d-flex justify-content-between align-items-center p-3 border rounded shadow-sm">
              <div className="fs-5 fw-bold">貨到付款</div>
              <div className="fs-6 text-muted">現付</div>
            </div>
          )}
        </div>
        <div
          className={`${style.totalAmountBox} shadow-sm rounded d-flex gap-5`}
        >
          <div className="flex-grow-1">
            <h5 className="fw-bold">商品金額</h5>
            <div className="fs-5">${productsTotal}</div>
          </div>
          <div className="flex-grow-1">
            <h5 className="fw-bold">運費</h5>
            <div className="fs-5">
              ${formData.recipientData.pickupMethod.price}
            </div>
          </div>
          <div className="flex-grow-1">
            <h5 className="fw-bold">總金額</h5>
            <div className="fw-bold text-danger fs-5">${orderTotal}</div>
          </div>
          <div className="flex-grow-1">
            <button className={`${style.placeOrderBtn} rounded`} type="submit">
              {isLoading ? (
                <div className="text-center">
                  <div
                    className="spinner-border spinner-border-sm text-warning"
                    role="status"
                  >
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>
              ) : (
                <span className="text-white">下訂單</span>
              )}
            </button>
          </div>
        </div>
      </form>
      {/*手機版 */}
      <div className="d-md-none">
        <div className="bg-white rounded p-2 shadow-sm">
          <button
            className="w-100 d-flex justify-content-between border-0 bg-white p-0"
            onClick={() => setShowShippingModal(true)}
          >
            <span className="fw-bold text-dark">寄送方式</span>
            <span className="text-secondary">查看全部&gt;</span>
          </button>
          <div
            className="p-2 mt-2 border border-success rounded"
            style={{ backgroundColor: "rgb(233, 248, 239)" }}
          >
            <button
              className={`${style.phoneShippingInformation} w-100 border-0 p-0`}
              onClick={() => setShowShippingModal(true)}
            >
              <div className="row gap-2 text-dark">
                <div className="d-flex justify-content-between fw-bold">
                  <span>{formData.recipientData.pickupMethod.label}</span>
                  <span>${formData.recipientData.pickupMethod.price}</span>
                </div>
                <span className="fw-bold">
                  取貨門市:{formData.recipientData.address}
                </span>
                <span className="text-secondary">
                  {formData.recipientData.name}&nbsp;&middot;&nbsp;
                  <span>{formData.recipientData.phoneNumber}</span>
                </span>
                <span>備註:{formData.recipientData.note}</span>
              </div>
            </button>
          </div>
          {/*ShippingModal */}
          <Modal
            show={showShippingModal}
            onHide={() => setShowShippingModal(false)}
            dialogClassName={`${style.modalBottom} modal-sm modal-fullwidth`}
            backdrop={true}
          >
            <Modal.Header className="w-100 justify-content-center">
              <Modal.Title>寄送資訊</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <div>
                <div className="d-grid gap-3 mb-3">
                  {recipientOptions.map((option) => {
                    return (
                      <div key={`mobile-${option.value}`}>
                        <label className="w-100 d-flex justify-content-between align-items-center">
                          <div>{option.label}</div>
                          <div className="d-flex gap-2 align-items-center">
                            ${option.price}
                            <input
                              type="radio"
                              className="me-2"
                              name="pickupMethod"
                              value={option.value}
                              checked={
                                mobileFormData.recipientData.pickupMethod
                                  .value === option.value
                              }
                              onChange={handleInputChange(setMobileFormData)}
                              data-group="recipientData"
                            />
                          </div>
                        </label>
                      </div>
                    );
                  })}
                </div>
                <div>
                  <div className="d-flex justify-content-between align-items-center">
                    <label htmlFor="mobileShippingName">收件人姓名</label>
                    <input
                      type="text"
                      placeholder="姓名"
                      className={`${style.shippingModalInput} border-0 text-end`}
                      id="mobileShippingName"
                      name="name"
                      value={mobileFormData.recipientData.name}
                      onChange={handleInputChange(setMobileFormData)}
                      data-group="recipientData"
                      required
                    />
                  </div>
                  <hr />
                  <div className="d-flex justify-content-between align-items-center">
                    <label htmlFor="mobileShippingPhone">手機</label>
                    <input
                      type="text"
                      placeholder="手機號碼"
                      className={`${style.shippingModalInput} border-0 text-end`}
                      id="mobileShippingPhone"
                      name="phoneNumber"
                      maxLength={10}
                      value={mobileFormData.recipientData.phoneNumber}
                      onChange={handleInputChange(setMobileFormData)}
                      data-group="recipientData"
                      required
                    />
                  </div>
                  <hr />
                  <div className="d-flex justify-content-between align-items-center">
                    <label htmlFor="mobileShippingAddress">寄送地址</label>
                    <input
                      type="text"
                      placeholder="到府地址/超商門市/店到店"
                      className={`${style.shippingModalInput} border-0 text-end`}
                      id="mobileShippingAddress"
                      name="address"
                      value={mobileFormData.recipientData.address}
                      onChange={handleInputChange(setMobileFormData)}
                      data-group="recipientData"
                      required
                    />
                  </div>
                  <hr />
                  <div className="d-flex justify-content-between align-items-center">
                    <label htmlFor="mobileShippingNote">備註</label>
                    <input
                      type="text"
                      placeholder="備註"
                      className={`${style.shippingModalInput} border-0 text-end`}
                      id="mobileShippingNote"
                      name="note"
                      value={mobileFormData.recipientData.note}
                      onChange={handleInputChange(setMobileFormData)}
                      data-group="recipientData"
                    />
                  </div>
                  <hr />
                </div>
              </div>

              <button
                className="w-100 border-0 text-white rounded py-2"
                style={{ backgroundColor: "#ffa042" }}
                onClick={handleMobileConfirmShipping}
              >
                確認
              </button>
            </Modal.Body>
          </Modal>
          <hr />
          <div className="d-flex justify-content-between">
            <div>
              <span>{productItems.length}</span>&nbsp;個商品
            </div>
            <div className="fw-bold">${productsTotal}</div>
          </div>
        </div>
        <div className="bg-white rounded p-2 d-md-none shadow-sm mt-2">
          <button
            className="w-100 d-flex justify-content-between border-0 bg-white p-0 mb-3"
            onClick={() => setShowPaymethodModal(true)}
          >
            <span className="fw-bold text-dark">付款方式</span>
            <span className="text-secondary">查看全部&gt;</span>
          </button>
          <div className="d-flex justify-content-between">
            <div className="d-flex justify-content-center align-items-center">
              <img
                src={formData.paymentMethodData.paymentMethod.img}
                className={style.paymentIcon}
                alt="paymentImg"
              />
              <span>{formData.paymentMethodData.paymentMethod.label}</span>
            </div>
            <img src="images/icons/tick.png" className={style.tickIcon} alt="tickIcon"/>
          </div>

          {formData.paymentMethodData.paymentMethod.value === "creditCard" && (
            <div
              className="p-2 mt-2 border border-success rounded"
              style={{ backgroundColor: "rgb(233, 248, 239)" }}
            >
              <div className="d-grid gap-2">
                {/*信用卡 */}
                <div className="d-flex justify-content-between align-items-center">
                  <label className="form-label" htmlFor="cardNumber">
                    卡號
                  </label>
                  <input
                    type="text"
                    className="form-control w-75"
                    placeholder="請輸入信用卡卡號"
                    id="cardNumber"
                    maxLength={16}
                    name="cardNumber"
                    onChange={handleInputChange(setFormData)}
                    value={formData.paymentMethodData.cardNumber}
                    data-group="paymentMethodData"
                    required
                  />
                  <div className="invalid-feedback">必填</div>
                </div>
                <div className="d-flex justify-content-between align-items-center">
                  <label className="form-label" htmlFor="cardExpiry">
                    有效期限
                  </label>
                  <div className="d-flex gap-3 w-75">
                    <select
                      className="form-select"
                      name="cardExpiryMonth"
                      value={formData.paymentMethodData.cardExpiryMonth}
                      onChange={handleInputChange(setFormData)}
                      data-group="paymentMethodData"
                      required
                    >
                      <option value="">MM</option>
                      {Array.from({ length: 12 }, (_, i) => {
                        const month = (i + 1).toString().padStart(2, "0");
                        return (
                          <option key={month} value={month}>
                            {month}
                          </option>
                        );
                      })}
                    </select>
                    <div className="invalid-feedback">必填</div>
                    <span className="d-flex align-items-center">/</span>
                    <select
                      className="form-select"
                      name="cardExpiryYear"
                      value={formData.paymentMethodData.cardExpiryYear}
                      onChange={handleInputChange(setFormData)}
                      data-group="paymentMethodData"
                      required
                    >
                      <option value="">YY</option>
                      {Array.from({ length: 6 }, (_, i) => {
                        const year = new Date().getFullYear() + i;
                        return (
                          <option key={year} value={year}>
                            {year}
                          </option>
                        );
                      })}
                    </select>
                    <div className="invalid-feedback">必填</div>
                  </div>
                </div>
                <div className="d-flex justify-content-between align-items-center">
                  <label className="form-label" htmlFor="cardCVV">
                    安全碼
                  </label>
                  <input
                    type="text"
                    className="form-control w-75"
                    placeholder="CVV"
                    maxLength={3}
                    minLength={3}
                    name="cardCVV"
                    onChange={handleInputChange(setFormData)}
                    value={formData.paymentMethodData.cardCVV}
                    data-group="paymentMethodData"
                    required
                  />
                  <div className="invalid-feedback">必填</div>
                </div>
              </div>
            </div>
          )}
          {formData.paymentMethodData.paymentMethod.value ===
            "mobilePayment" && (
            <div
              className="p-2 mt-2 border border-success rounded"
              style={{ backgroundColor: "rgb(233, 248, 239)" }}
            >
              <div className="d-flex gap-1">
                {/*行動支付 */}
                {mobilePay.map((pay) => {
                  return (
                    <button
                      key={pay}
                      className={`p-2 bg-white rounded fw-bold ${
                        style.mobilePaySelectBtn
                      } ${
                        formData.paymentMethodData.mobilePay === pay
                          ? style.mobilePaySelectBtnChange
                          : ""
                      }`}
                      type="button"
                      onClick={() => handleMobilePaySelect(pay)}
                    >
                      {pay}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {formData.paymentMethodData.paymentMethod.value === "atmTransfer" && (
            <div
              className="p-2 mt-2 border border-success rounded"
              style={{ backgroundColor: "rgb(233, 248, 239)" }}
            >
              <div className="d-grid gap-2">
                {/*ATM轉帳 */}
                <div className="d-flex justify-content-between align-items-center">
                  <span className="fw-bold">銀行名稱</span>
                  <span>中華郵政(700)</span>
                </div>
                <div className="d-flex justify-content-between align-items-center">
                  <span className="fw-bold">帳號</span>
                  <span> 00717482660264</span>
                </div>
                <div
                  className="rounded d-flex align-items-center justify-content-center"
                  style={{ backgroundColor: "rgba(248, 215, 218)" }}
                >
                  <div className="text-danger fw-bold">
                    請於 3 日內完成匯款，並保留轉帳憑證！
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        {/*PaymethodModal */}
        <Modal
          show={showPaymethodModal}
          onHide={() => setShowPaymethodModal(false)}
          dialogClassName={`${style.modalBottom} modal-sm modal-fullwidth`}
          backdrop={true}
        >
          <Modal.Header className="w-100 justify-content-center">
            <Modal.Title>付款方式</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div className="d-grid gap-2">
              {paymentMethodOptions.map((option) => {
                return (
                  <label
                    className="d-flex justify-content-between "
                    key={option.value}
                  >
                    <div className="d-flex justify-content-center align-items-center">
                      <img src={option.img} className={style.paymentIcon} alt="paymentIcon"/>
                      <span>{option.label}</span>
                    </div>
                    <input
                      type="radio"
                      className="me-2"
                      name="paymentMethod"
                      value={option.value}
                      checked={
                        mobileFormData.paymentMethodData.paymentMethod.value ===
                        option.value
                      }
                      onChange={handleInputChange(setMobileFormData)}
                      data-group="paymentMethodData"
                    />
                  </label>
                );
              })}
            </div>
            <button
              className="w-100 border-0 text-white rounded py-2 mt-3"
              style={{ backgroundColor: "#ffa042" }}
              onClick={handleMobileConfirmPaymethod}
            >
              確認
            </button>
          </Modal.Body>
        </Modal>

        <div className="bg-white rounded p-2 d-md-none shadow-sm mt-2">
          <div className="fw-bold mb-2">付款詳情</div>
          <div className="d-grid gap-1">
            <div className="d-flex justify-content-between text-secondary">
              <span>商品總金額</span>
              <span>${productsTotal}</span>
            </div>
            <div className="d-flex justify-content-between text-secondary">
              <span>運費總金額</span>
              <span>${formData.recipientData.pickupMethod.price}</span>
            </div>
            <hr />
            <div className="d-flex justify-content-between">
              <span>總付款金額</span>
              <span>${orderTotal}</span>
            </div>
          </div>
        </div>
        <div
          className="bg-white p-2 mt-2 rounded shadow-sm d-flex justify-content-between align-items-center"
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 1000,
            borderTop: "1px solid #ddd",
          }}
        >
          <span>
            總付款金額
            <span className="text-danger fs-5 ms-2">${orderTotal}</span>
          </span>
          <button
            className="rounded text-white btn btn-lg px-4 fw-bold"
            style={{ backgroundColor: "#ffa042" }}
            onClick={handleOrderClick}
          >
            結帳
          </button>
        </div>
      </div>
    </div>
  );
}
