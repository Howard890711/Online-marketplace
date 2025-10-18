import { useNavigate } from "react-router-dom";
import 'bootstrap-icons/font/bootstrap-icons.css';



export default function MobileHeader({pathName}) {
  const navigate=useNavigate()
  return (
    <div className="bg-white p-2 d-flex justify-content-between align-items-center">
      <button className="btn btn-link" onClick={() => navigate(-1)}>
        <i className="bi bi-arrow-left" style={{color:"red",fontSize:"25px"}}></i>
      </button>
      <div className="fw-bold fs-5">
        {pathName}
      </div>
      <div style={{width:"40px"}}></div>
    </div>
  );
}
