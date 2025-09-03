import { Link, useNavigate } from "react-router-dom";
import "./index.css";
import { useEffect, useState } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../../utils/firebase";
import { useUser } from "../../UserContext";
import { getStorage, ref, getDownloadURL } from "firebase/storage";

export default function Header() {
  const { cartData, userData } = useUser();
  const [searchKeyword, setSearchKeyword] = useState("");
  const [userImg, setUserImg] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const navigate = useNavigate();

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize); //視窗大小改變時呼叫
    return () => window.removeEventListener("resize", handleResize); //清除事件
  }, []);

  useEffect(() => {
    if (!userData) return;
    const storage = getStorage();
    const imgPath = userData.userImg
      ? userData.userImg
      : "defaultImages/userImg.png";
    const defaultRef = ref(storage, imgPath);
    getDownloadURL(defaultRef)
      .then((url) => {
        setUserImg(url);
      })
      .catch((err) => {
        console.error("載入頭像失敗", err);
      });
  }, [userData]);

  const handleSearch = (e) => {
    setSearchKeyword(e.target.value);
  };

  const handleSearchButton = () => {
    navigate(`/Search?keyword=${searchKeyword}`);
  };

  const handleSignOut = () => {
    signOut(auth)
      .then(() => {
        navigate("/");
      })
      .catch((error) => {
        console.log("登出失敗", error);
      });
  };

  return (
    <header className="headerContainer w-100">
      <div className="headerContent">
        <Link to="/" className="headerLogo justify-content-center">
          <img
            src={
              isMobile
                ? "/images/icons/headerLogo.png"
                : "/images/icons/logoDog.png"
            }
            className="logoImg"
            alt="logoImg"
          />
        </Link>
        <div className="headerRight">
          <div className="input-group">
            <input
              type="text"
              className="border-0 rounded-start searchInput"
              placeholder="搜尋"
              value={searchKeyword}
              onChange={handleSearch}
            />
            <button
              className="searchBtn border-0 rounded-end  bg-white p-2"
              type="button"
              onClick={handleSearchButton}
            >
              <img
                src={process.env.PUBLIC_URL + "/images/icons/searchIcon.png"}
                className="searchIcon btn-icon"
                alt="searchIcon"
              />
            </button>
          </div>

          {userData ? (
            <>
              <Link to="/ShoppingCart" className="position-relative">
                <div className="position-absolute top-1 bg-white shoppingCartNumberBox">
                  <span className="shoppingCartNumber">
                    {cartData.length < 99 ? cartData.length : "99+"}
                  </span>
                </div>
                <img
                  src="/images/icons/cart.png"
                  className="shoppingCartIcon"
                  alt="shoppingCartIcon"
                />
              </Link>
              <div className="userHeadShotBox dropdown">
                  <button
                    className="userHeadShotBtn dropdown-toggle border-0"
                    type="button"
                    id="userHeadShotBtn"
                    data-bs-toggle="dropdown"
                    aria-expanded="false"
                  >
                    <img
                      src={userImg}
                      className="userHeadShot rounded-circle"
                      alt="userHeadShot"
                    />
                  </button>
                  <ul
                    className="dropdown-menu dropdown-menu-end mt-2 userDropDown"
                    aria-labelledby="userHeadShotBtn"
                  >
                    <li>
                      <a className="dropdown-item" href="/Profile/MyAccount">
                        我的主頁
                      </a>
                    </li>
                    <li>
                      <a
                        className="dropdown-item"
                        href="/Profile/ShoppingHistory"
                      >
                        購買清單
                      </a>
                    </li>
                    <li>
                      <hr className="dropdown-divider"></hr>
                    </li>
                    <li>
                      <span className="dropdown-item" onClick={handleSignOut}>
                        登出
                      </span>
                    </li>
                  </ul>
              </div>
            </>
          ) : (
            <Link to="/LoginForm" className="text-decoration-none text-end" style={{width:"120px"}}>
              <span className="fw-bold text-white">登入</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
