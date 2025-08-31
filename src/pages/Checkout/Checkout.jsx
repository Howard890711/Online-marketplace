import { useEffect, useState } from "react";
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
import { TbRuler2 } from "react-icons/tb";

export default function Checkout() {
  const location = useLocation();
  const { productItems } = location.state || {};
  console.log(productItems);
  const navigate = useNavigate();
  const [products, setProducts] = useState(new Map());
  const [isLoading,setIsLoading]=useState(false);
  const { userData, setOrderData } = useUser();
  const mobilePay = ["Line Pay", "Apple Pay", "Google Pay", "街口支付"];
  const recipientOptions = [
    { label: "店到店取貨$45", value: "storePickup", price: 45 },
    { label: "超商取貨$60", value: "convenienceStore", price: 60 },
    { label: "宅配到府$100", value: "homeDelivery", price: 100 },
  ];
  const paymentMethodOptions = [
    { label: "信用卡付款", value: "creditCard" },
    { label: "行動支付", value: "mobilePayment" },
    { label: "ATM轉帳", value: "atmTransfer" },
    { label: "貨到付款", value: "cashOnDelivery" },
  ];
  const [recipientRadio, setRecipientRadio] = useState("storePickup"); //預設取貨
  const [paymentMethodRadio, setPaymentMethodRadio] =
    useState("cashOnDelivery"); //付款方式
  console.log("products:", products);

  const [formData, setFormData] = useState({
    recipientData: {
      name: "",
      phoneNumber: "",
      address: "",
      note: "",
    },

    paymentMethodData: {
      paymentMethod: "cashOnDelivery",
      //信用卡欄位
      cardNumber: "",
      cardExpiryMonth: "",
      cardExpiryYear: "",
      cardCVV: "",
      //行動支付欄位
      mobilePay: "",
    },
  });

  const productsTotal = Array.from(products).reduce(
    (sum, [_, item]) => sum + item.productSubtotal,
    0
  );
  const selectRecipient = recipientOptions.find(
    (option) => option.value === recipientRadio
  );
  const freight = selectRecipient ? selectRecipient.price : 0;
  const orderTotal =
    Array.from(products).reduce(
      (sum, [_, item]) => sum + item.productSubtotal,
      0
    ) + freight;

  useEffect(() => {
    const updataOrder = new Map();
    const orderPromise = productItems.map(([productId, productData]) => {
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

  const handleInputChange = (e) => {
    const { name, value, dataset } = e.target;

    if (dataset.group === "recipientData") {
      //收件人資訊
      if (name === "phoneNumber" && !/^\d*$/.test(value)) {
        return;
      }
      setFormData((prev) => ({
        ...prev, //拷貝formData
        recipientData: {
          ...prev.recipientData, //拷貝recipient中的data(不拷貝recipient中的資料會被清掉)
          [name]: value,
        },
      }));
      console.log(formData.recipientData);
    } else if (dataset.group === "paymentMethodData") {
      //變更付款方式
      if (name === "paymentMethod") {
        //若是付款方式更動就直接設定
        setPaymentMethodRadio(value);
      }

      if (
        (name === "cardNumber" || name === "cardCVV") &&
        !/^\d*$/.test(value) &&
        value !== ""
      ) {
        return;
      }
      setFormData((prev) => ({
        ...prev,
        paymentMethodData: {
          ...prev.paymentMethodData,
          [name]: value,
        },
      }));
      console.log(formData.paymentMethodData);
    }
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

  const handleRecipientRadioChange = (e) => {
    //變更取貨方式
    setRecipientRadio(e.target.value);
  };

  const handlePliceOrderClick = (e) => {
    const form = e.currentTarget;
    if (!form.checkValidity()) {
      e.preventDefault();
      e.stopPropagation();
      form.classList.add("was-validated");
      return;
    }
    setIsLoading(true)
    e.preventDefault();
    const orderDate = Timestamp.fromDate(new Date(new Date().toDateString()));
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
    };
    console.log(data);
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
        setIsLoading(false)
        navigate("/Profile/ShoppingHistory");
      })
      .catch((error) => {
        console.error("訂單新增失敗", error);
        setIsLoading(false)
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
  }, [formData.paymentMethodData.paymentMethod]);

  return (
    <div className={style.checkoutPage}>
      <div className={`${style.titleBox} rounded shadow-sm`}>
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
            <div className="row d-flex align-items-center mb-3" key={productId}>
              <div className="col-6 d-flex align-items-center">
                <img src={imageUrl} className={style.productImg} alt="productImg"/>
                <h5 className="ms-4">{name}</h5>
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
          );
        })}
      </div>

      <form
        onSubmit={handlePliceOrderClick}
        className="needs-validation"
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
                      name="shippingMethod"
                      value={option.value}
                      checked={recipientRadio === option.value}
                      onChange={handleRecipientRadioChange}
                    />
                    {option.label}
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
                onChange={handleInputChange}
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
                onChange={handleInputChange}
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
                onChange={handleInputChange}
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
              onChange={handleInputChange}
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
                      checked={paymentMethodRadio === option.value}
                      onChange={handleInputChange}
                      data-group="paymentMethodData"
                    />
                    {option.label}
                  </label>
                </div>
              );
            })}
          </div>
          {formData.paymentMethodData.paymentMethod === "creditCard" && (
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
                  onChange={handleInputChange}
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
                    onChange={handleInputChange}
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
                    onChange={handleInputChange}
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
                  onChange={handleInputChange}
                  value={formData.paymentMethodData.cardCVV}
                  data-group="paymentMethodData"
                  required
                />
                <div className="invalid-feedback">必填</div>
              </div>
            </div>
          )}

          {formData.paymentMethodData.paymentMethod === "mobilePayment" && (
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
                    onClick={() => handleMobilePaySelect(pay)}
                  >
                    {pay}
                  </button>
                );
              })}
            </div>
          )}
          {formData.paymentMethodData.paymentMethod === "atmTransfer" && (
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
          {formData.paymentMethodData.paymentMethod === "cashOnDelivery" && (
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
            <div className="fs-5">${freight}</div>
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
    </div>
  );
}
