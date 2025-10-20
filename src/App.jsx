import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import "./App.css";
import HomePage from "./pages/HomePage/HomePage";
import Header from "./components/Header";
import Footer from "./components/Footer";
import MobileHeader from "./MobileHeader";
import { UserProvider } from "./UserContext";
import ScrollToTop from "./utils/scrollToTap";
import ProtectedRoute from "./pages/ProtectedRoute";
import { lazy, Suspense, useEffect, useState } from "react";

const ProductDetail=lazy(()=>import("./pages/ProductDetail/ProductDetail"));
const LoginForm=lazy(()=>import("./pages/LoginForm/LoginForm"));
const Profile=lazy(()=>import("./pages/Profile/Profile"));
const ShoppingCart=lazy(()=>import("./pages/ShoppingCart/ShoppingCart"))
const Checkout=lazy(()=>import("./pages/Checkout/Checkout"));


function AppLayout() {
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(false);
  const hiddenHeaderPages = {
    "/ShoppingCart": "購物車",
    "/Checkout": "結帳",
  };

  useEffect(() => {
    const mq = window.matchMedia("(max-width:767px)");
    setIsMobile(mq.matches);

    const handler = (e) => setIsMobile(e.matchMedia);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const pathName = hiddenHeaderPages[location.pathname];
  const isHiddenPage = !!pathName;

  return (
    <div className="d-flex flex-column min-vh-100 w-100">
      {!(isMobile && isHiddenPage) && <Header />}
      {isMobile && isHiddenPage && <MobileHeader pathName={pathName} />}
      <div className="flex-grow-1">
        <ScrollToTop />
        <Suspense fallback={<div className="text-center">Loading....</div>}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/Search" element={<HomePage />} />
          <Route path="/ProductDetail/:id" element={<ProductDetail />} />
          <Route path="/LoginForm" element={<LoginForm />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/ShoppingCart" element={<ShoppingCart />} />
            <Route path="/Profile/:section" element={<Profile />} />
            <Route path="/Checkout" element={<Checkout />} />
          </Route>
        </Routes>
        </Suspense>
      </div>
      <Footer className="d-none d-md-block" />
    </div>
  );
}

function App() {
  return (
    <UserProvider>
      <BrowserRouter>
        <AppLayout />
      </BrowserRouter>
    </UserProvider>
  );
}

export default App;
