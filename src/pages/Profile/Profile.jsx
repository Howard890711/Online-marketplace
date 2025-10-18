import style from "./Profile.module.css";
import MyAccount from "../../components/MyAccount";
import ChangePassword from "../../components/ChangePassword";
import ShoppingHistory from "../../components/ShoppingHistory";
import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";

export default function Profile() {
  const { section } = useParams();
  const [currentComponent, setCurrentComponent] = useState(section);
  const navigate = useNavigate();

  let renderComponent;

  switch (currentComponent) {
    case "MyAccount":
      renderComponent = <MyAccount />;
      break;
    case "ChangePassword":
      renderComponent = <ChangePassword />;
      break;
    case "ShoppingHistory":
      renderComponent = <ShoppingHistory />;
      break;
    default:
      renderComponent = <MyAccount />;
      break;
  }

  useEffect(() => {
    setCurrentComponent(section);
  }, [section]);

  const handleNavigate = (path) => {
    navigate(`/Profile/${path}`);
  };

  return (
    <div className={style.profilePage}>
      <div className="d-md-flex d-grid gap-3">
        <div className="flex-column gap-3 p-3 d-none d-md-flex">
          <h2>我的帳戶</h2>
          <button
            className={style.pageBtn}
            onClick={() => handleNavigate("MyAccount")}
          >
            個人資料
          </button>
          <button
            className={style.pageBtn}
            onClick={() => handleNavigate("ChangePassword")}
          >
            修改密碼
          </button>
          <button
            className={style.pageBtn}
            onClick={() => handleNavigate("ShoppingHistory")}
          >
            購買清單
          </button>
        </div>
        <div className="d-md-none rounded d-flex bg-white justify-content-between w-100 p-2 px-4">
          <button
            className={`border-0 bg-white ${style.changeBtn} ${currentComponent==="MyAccount"? "rounded shadow":""}`}
            onClick={() => handleNavigate("MyAccount")}
          >
            <img
              src="/images/head_shot/userImg.png"
              className={style.btnIcon}
              alt="MyAccountIcon"
            />
            <span className="text-dark">個人資料</span>
          </button>
          <button
            className={`border-0 bg-white ${style.changeBtn} ${currentComponent==="ChangePassword"? "rounded shadow":""}`}
            onClick={() => handleNavigate("ChangePassword")}
          >
            <img
              src="/images/icons/changePassword.png"
              className={style.btnIcon}
              alt="changePasswordIcon"
            />
            <span className="text-dark">變更密碼</span>
          </button>
          <button
            className={`border-0 bg-white ${style.changeBtn} ${currentComponent==="ShoppingHistory"? "rounded shadow":""}`}
            onClick={() => handleNavigate("ShoppingHistory")}
          >
            <img
              src="/images/icons/purchareHistory.png"
              className={style.btnIcon}
              alt="purchareHistoryIcon"
            />
            <span className="text-dark">購買清單</span>
          </button>
        </div>
        <div className="bg-white p-3 flex-grow-1">{renderComponent}</div>
      </div>
    </div>
  );
}
