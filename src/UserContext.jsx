import {
  createContext,
  useContext,
  useState,
  useEffect,
} from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, getDocs, collection } from "firebase/firestore";
import { auth, db } from "./utils/firebase";

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [userData, setUserData] = useState(null);
  const [cartData, setCartData] = useState([]);
  const [orderData, setOrderData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        const uid = user.uid;
        setLoading(true);

        getDoc(doc(db, "users", uid))
          .then((userDoc) => {
            if (userDoc.exists()) {
              setUserData({ uid, ...userDoc.data() });
            }
            return getDocs(collection(db, "users", uid, "shoppingCart"));
          })
          .then((cartSnapshot) => {
            const cartItems = cartSnapshot.docs.map((doc) => ({
              cartId:doc.data().cartId,
              productId: doc.data().productId,
              productQuantity: doc.data().productQuantity,
              productSubtotal:doc.data().productSubtotal
            }));
            setCartData(cartItems);

            return getDocs(collection(db, "users", uid, "orders"));
          })
          .then((orderSnapshot) => {
            const orders = orderSnapshot.docs.map((doc) => {
              const data=doc.data()
              return {
                orderDate:data.orderDate,
                orderId:data.orderId,
                orderSubtotal:data.orderSubtotal,
                productItems:data.productItems
              }
              
          });
            setOrderData(orders);
          })
          .catch((error) => {
            console.error("抓取使用者資料錯誤：", error);
          })
          .finally(() => {
            setLoading(false);
            console.log(userData)
          });
      } else {
        // 使用者登出
        setUserData(null);
        setCartData([]);
        setOrderData([]);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  return (
    <div>
      <UserContext.Provider
        value={{
          userData,
          cartData,
          orderData,
          loading,
          setUserData,
          setCartData,
          setOrderData,
        }}
      >
        {children}
      </UserContext.Provider>
    </div>
  );
};

export const useUser = () => useContext(UserContext);
