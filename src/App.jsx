import { BrowserRouter, Route, Routes } from "react-router-dom";
import "./App.css";
import HomePage from "./pages/HomePage/HomePage";
import Header from "./components/Header";
import Footer from "./components/Footer";
import ProductDetail from "./pages/ProductDetail/ProductDetail";
import LoginForm from "./pages/LoginForm/LoginForm";
import ShoppingCart from "./pages/ShoppingCart/ShoppingCart";
import Profile from "./pages/Profile/Profile";
import Checkout from "./pages/Checkout/Checkout";
import { UserProvider } from "./UserContext";
import ScrollToTop from "./utils/scrollToTap";
import ProtectedRoute from "./pages/ProtectedRoute";

function App() {
  return (
    <UserProvider>
      <BrowserRouter>
        <div className="d-flex flex-column min-vh-100 w-100">
          <Header />
          <div className="flex-grow-1">
            <ScrollToTop />
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
          </div>

          <Footer /> 
        </div>
      </BrowserRouter>
    </UserProvider>
  );
}

export default App;
