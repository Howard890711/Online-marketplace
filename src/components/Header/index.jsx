import { Link, useNavigate } from "react-router-dom";
import "./index.css";
import { useEffect, useState } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../../utils/firebase";
import { useUser } from "../../UserContext";
import { getStorage,ref,getDownloadURL } from "firebase/storage";

export default function Header() {
  const { cartData, userData } = useUser();
  const [searchKeyword, setSearchKeyword] = useState("");
  const [result, setResult] = useState([]);
  const [userImg,setUserImg]=useState(null)
  const navigate = useNavigate();

  useEffect(() => {
    if(!userData)return;
    const storage=getStorage()
    const imgPath=userData.userImg?userData.userImg:"defaultImages/userImg.png"
    const defaultRef=ref(storage,imgPath)
    getDownloadURL(defaultRef)
    .then((url)=>{
      setUserImg(url)
    })
    .catch(err=>{
      console.error("載入頭像失敗",err)
    })
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
    <header className="header">
      <div className="d-flex align-items-center">
        <Link to="/" className="justify-content-center">
          <img src="/images/icons/logoDog.png" className="logoImg" alt="logoImg"/>
        </Link>
        <div className="input-group w-50 ms-auto align-items-center">
          <input
            type="text"
            className="form-control"
            placeholder="搜尋"
            value={searchKeyword}
            onChange={handleSearch}
          />
          <button
            className="btn searchBtn rounded-end border bg-white"
            type="button"
            onClick={handleSearchButton}
          >
            <img
              src={process.env.PUBLIC_URL + "/images/icons/searchIcon.png"}
              className="searchIcon"
              alt="searchIcon"
            />
          </button>

          {userData ? (
            <>
              <div className="mx-4 position-relative">
                <Link to="/ShoppingCart">
                  <div className="position-absolute  bg-white shoppingCartNumberBox">
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
              </div>
              <div className="position-relative">
                <div className="userHeadShotBox position-absolute dropdown">
                  <button
                    className="btn dropdown-toggle border-0"
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
                    className="dropdown-menu mt-2"
                    aria-labelledby="userHeadShotBtn"
                  >
                    <li>
                      <a className="dropdown-item" href="/Profile/MyAccount">
                        我的主頁
                      </a>
                    </li>
                    <li>
                      <a className="dropdown-item" href="/Profile/ShoppingHistory">
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
              </div>
            </>
          ) : (
            <Link to="/LoginForm" className="text-decoration-none">
              <span className="ms-4 fw-bold text-white">登入</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
