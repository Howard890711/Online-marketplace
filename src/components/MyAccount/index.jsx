import React, { useEffect, useRef, useState } from "react";
import "./index.css";
import { useUser } from "../../UserContext";
import { Timestamp } from "firebase/firestore";
import { doc, updateDoc } from "firebase/firestore";
import { getStorage, ref, getDownloadURL, uploadBytes } from "firebase/storage";
import { db } from "../../utils/firebase";
import swal from "sweetalert";

export default function MyAccount() {
  const { userData,setUserData } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [sentIsLoading, setSentIsLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [phoneFocused, setPhoneFocused] = useState(false);
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phoneNumber: "",
    birthYear: 0,
    birthMonth: 0,
    birthDay: 0,
    gender: "",
    userImg: "",
  });
  console.log(userData)

  useEffect(() => {
    if (!userData)return;
    setIsLoading(true);

    try{
    const { name, email, phoneNumber, birthDayDate, gender, userImg } =
      userData;
    const birthDay = birthDayDate?.toDate?.();
    setFormData({
      name: name || "",
      email: email || "",
      phoneNumber: phoneNumber || "",
      birthYear: birthDay.getFullYear(),
      birthMonth: birthDay.getMonth() + 1,
      birthDay: birthDay.getDate(),
      gender: gender || "",
      userImg: userImg || "/images/head_shot/userImg.png",
    });
  }catch(err){
    console.log("初始化Data錯誤",err)
  }finally{
    setIsLoading(false)
  }
  }, [userData]);

  const maskEmail = (email) => {
    if (!email) return;
    const [name, domain] = email.split("@");
    if (name.length <= 2) return "*@" + domain;
    return name.slice(0, 2) + "*".repeat(name.length - 2) + "@" + domain;
  };

  const maskPhone = (phone) => {
    if (!phone) return "";
    return phone.slice(0, 3) + "*".repeat(phone.length - 5) + phone.slice(-2);
  };

  const handleInputOnChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleOnSubmit = async (e) => {
    e.preventDefault();
    setSentIsLoading(true);
    const form = e.currentTarget;
    if (!form.checkValidity()) {
      e.stopPropagation();
      form.classList.add("was-validated");
      setSentIsLoading(false);
      return;
    }
    const {
      name,
      email,
      phoneNumber,
      birthYear,
      birthMonth,
      birthDay,
      gender,
    } = formData;
    const birthDayDate = new Date(birthYear, birthMonth - 1, birthDay);
    const firebaseTimestamp = Timestamp.fromDate(birthDayDate);
    const docRef = doc(db, "users", userData.uid);
    try {
      let updatedUserImg = formData.userImg;
      if (selectedFile) {
        const storage = getStorage();
        const fileRef = ref(storage, `userImg/${userData.uid}.jpeg`);
        await uploadBytes(fileRef, selectedFile);
        const newUrl= await getDownloadURL(fileRef);
        updatedUserImg=newUrl+"?t="+new Date().getTime()
        setFormData(prev=>({
          ...prev,
          userImg:updatedUserImg,
        }))
        
        setUserData((prev)=>({
          ...prev,
          userImg:updatedUserImg,
        }));
      }
      await updateDoc(docRef, {
        name,
        email,
        phoneNumber,
        birthDayDate: firebaseTimestamp,
        gender,
        userImg: updatedUserImg,
      });

      swal({
        title: "更新成功",
        icon: "success",
        button: true,
        dangerMode: false,
      });
    } catch (err) {
      swal({
        title: "更新失敗",
        icon: "warning",
        button: true,
        dangerMode: true,
      });
      console.error("更新失敗", err);
    } finally {
      setSentIsLoading(false);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSelectedFile(file);
    setFormData((prev) => ({
      ...prev,
      userImg: URL.createObjectURL(file),
    }));
  };

  const handleButtonClick = () => {
    fileInputRef.current.click();
  };

  return (
    <>
      <h2 className="ms-4">個人資料</h2>
      <hr />
      {isLoading ? (
        <div className="text-center" style={{ minHeight: "400px" }}>
          <div className="spinner-border text-warning" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : (
        <div className="formPadding row">
          <form
            className="d-flex flex-column gap-3 col-7"
            onSubmit={handleOnSubmit}
            noValidate
          >
            <div className="row d-flex align-items-center mb-3">
              <label
                htmlFor="username"
                className="col-3  text-end fw-bold me-4"
              >
                使用者名稱
              </label>
              <input
                type="text"
                className="col form-control"
                name="name"
                value={formData.name}
                onChange={handleInputOnChange}
                placeholder="請輸入名稱"
                required
              />
            </div>
            <div className="row d-flex align-items-center mb-3">
              <label htmlFor="email" className="col-3 text-end  fw-bold me-4">
                Email
              </label>
              <input
                type="text"
                className="col form-control"
                name="email"
                value={
                  emailFocused ? formData.email : maskEmail(formData.email)
                }
                onChange={handleInputOnChange}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                placeholder="請輸入Email"
                required
              />
            </div>
            <div className="row d-flex align-items-center mb-3">
              <label
                htmlFor="phoneNumber"
                className="col-3 text-end fw-bold me-4"
              >
                手機號碼
              </label>
              <input
                type="text"
                className="col form-control"
                name="phoneNumber"
                value={
                  phoneFocused
                    ? formData.phoneNumber
                    : maskPhone(formData.phoneNumber)
                }
                onChange={handleInputOnChange}
                onFocus={() => setPhoneFocused(true)}
                onBlur={() => setPhoneFocused(false)}
                placeholder="請輸入手機號碼"
                minLength={10}
                required
              />
            </div>
            <div className="row d-flex align-items-center mb-3">
              <label htmlFor="birthday" className="col-3 text-end fw-bold me-4">
                生日
              </label>
              <div className="col d-flex gap-4 p-0">
                <select
                  className="form-select"
                  name="birthYear"
                  value={formData.birthYear}
                  onChange={handleInputOnChange}
                >
                  {Array.from(
                    { length: new Date().getFullYear() - 1980 + 1 },
                    (_, i) => {
                      const year = 1980 + i;
                      return (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      );
                    }
                  )}
                </select>
                <select
                  className="form-select"
                  name="birthMonth"
                  value={formData.birthMonth}
                  onChange={handleInputOnChange}
                >
                  {Array.from({ length: 12 }, (_, i) => {
                    const month = 1 + i;
                    return (
                      <option key={month} value={month}>
                        {month}
                      </option>
                    );
                  })}
                </select>
                <select
                  className="form-select"
                  name="birthDay"
                  value={formData.birthDay}
                  onChange={handleInputOnChange}
                >
                  {Array.from({ length: 31 }, (_, i) => {
                    const day = 1 + i;
                    return (
                      <option key={day} value={day}>
                        {day}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
            <div className="row d-flex align-items-center mb-3">
              <label htmlFor="gender" className="col-3 text-end  fw-bold me-4">
                性別
              </label>
              <div className="col d-flex gap-4">
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="radio"
                    name="gender"
                    id="male"
                    value="male"
                    checked={formData.gender === "male"}
                    onChange={handleInputOnChange}
                  />
                  <label className="form-check-label" htmlFor="male">
                    男性
                  </label>
                </div>
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="radio"
                    name="gender"
                    id="female"
                    value="female"
                    checked={formData.gender === "female"}
                    onChange={handleInputOnChange}
                  />
                  <label className="form-check-label" htmlFor="female">
                    女性
                  </label>
                </div>
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="radio"
                    name="gender"
                    id="other"
                    value="other"
                    checked={formData.gender === "other"}
                    onChange={handleInputOnChange}
                  />
                  <label className="form-check-label" htmlFor="other">
                    其他
                  </label>
                </div>
              </div>
            </div>
            <div className="row d-flex align-items-center">
              <div className="col-3 me-4"></div>
              <div className="col p-0">
                <button
                  type="submit"
                  className="myAccountBtn border-0 rounded p-2"
                >
                  {sentIsLoading ? (
                    <div className="text-center">
                      <div
                        className="spinner-border spinner-border-sm text-warning"
                        role="status"
                      >
                        <span className="visually-hidden">Loading...</span>
                      </div>
                    </div>
                  ) : (
                    <span className="text-white">儲存</span>
                  )}
                </button>
              </div>
            </div>
          </form>

          <div className="userImgBox col-5">
            <div className="d-flex flex-column align-items-center">
              {formData.userImg && (
                <img
                  src={formData.userImg}
                  className="userImg rounded-circle"
                  alt="userImg"
                />
              )}
              <input
                type="file"
                className="d-none"
                ref={fileInputRef}
                accept=".jpg, .jpeg, .png"
                onChange={handleImageChange}
              />
              <input
                type="button"
                className="mt-4"
                value="更改圖片"
                onClick={handleButtonClick}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
