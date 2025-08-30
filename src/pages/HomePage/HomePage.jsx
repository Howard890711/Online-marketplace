import style from "./HomePage.module.css";
import algolia from "../../utils/algoliaSearch";
import { useEffect, useState, useRef, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import { db } from "../../utils/firebase";
import {
  getDocs,
  collection,
  query,
  orderBy,
  limit,
  startAfter,
} from "firebase/firestore";

export default function HomePage() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const keyword = params.get("keyword");

  const [result, setResult] = useState([]);

  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(false); //viewPort載入
  const [lastVisible, setLastVisible] = useState(null); //記入最後一筆
  const [listLoadingMore, setListLoadingMore] = useState(false); //紀錄是否正在載入中
  const [hasMore, setHasMore] = useState(true);
  const [displayProducts,setDisplayProducts]=useState([])
  const observerRef = useRef();
  const productLimit = 10;
  console.log(products);



  useEffect(() => {//search
    const fetchData=async()=>{
      if(!keyword||!keyword.trim()){
        if(!products.length){
          await fetchInitialProduct()
        }else{
          setDisplayProducts(products)
        }
        return;      
      }
      setIsLoading(true);
      try {
        const result = await algolia.search(keyword);
        console.log(result.hits);
        setResult(result.hits);
        setDisplayProducts(result.hits)
      } catch (error) {
        console.log("搜尋錯誤:", error);
        setResult([
          {
            error: true,
            message: error.message || "搜尋失敗",
          },
        ])
        setDisplayProducts([])
      } finally {
        setIsLoading(false);
      }
  }
  fetchData();
  }, [keyword,products]);

  const fetchInitialProduct = async () => {
    setIsLoading(true);
    try {
      const q = query(
        collection(db, "products"),
        orderBy("createdAt", "desc"),
        limit(productLimit)
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setProducts(data);
      setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
      setHasMore(snapshot.docs.length === productLimit);
    } catch (err) {
      console.error("載入失敗", err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMoreProducts = useCallback(async () => {
    if (!lastVisible || !hasMore || listLoadingMore) return;
    setListLoadingMore(true);
    try {
      const q = query(
        collection(db, "products"),
        orderBy("createdAt", "desc"),
        startAfter(lastVisible),
        limit(productLimit)
      );
      const snapshot = await getDocs(q);
      const newData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setProducts((prev) => [...prev, ...newData]);
      setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
      setHasMore(snapshot.docs.length === productLimit);
    } catch (err) {
      console.error("載入更多商品失敗", err);
    } finally {
      setListLoadingMore(false);
    }
  }, [lastVisible, hasMore, listLoadingMore]);

  const observerCallback = useCallback(
    //用callback避免每次render都重置observer記憶體位址
    (entries) => {
      if (entries[0].isIntersecting && !listLoadingMore && hasMore&&!keyword) {
        //inInterseciog為觀察的元素已在視窗內(viewPort)
        loadMoreProducts();
      }
    },
    [listLoadingMore, hasMore, loadMoreProducts]
  );

  useEffect(() => {
    if (!products.length||keyword) return; //商品未render完不建立observer

    const observer = new IntersectionObserver(observerCallback, {
      root: null, //用來指定觀察範圍，若為null就為整個視窗，除非有特定視窗不然都為null
      rootMargin: "0px", //用來看是否提前幾px觸發
      threshold: 1.0, //元素進入多少才觸發，1.0為全部進入viewPort
    });
    const currentTarget = observerRef.current; //要觀察的DOM
    if (currentTarget) {
      observer.observe(currentTarget);
    }
    return () => {
      if (currentTarget) observer.unobserve(currentTarget);
    };
  }, [observerCallback, products.length,keyword]);

  const getDiscountPrice = (discount, price) => {
    return Math.floor(price * (discount > 10 ? discount / 100 : discount / 10));
  };

  const setStarNum = (num) => {
    return parseFloat(num).toFixed(1);
  };







  return (
    <div className={style.homePage}>
      <div className={style.productGrid}>
        {isLoading
          ? Array.from({ length: 5 }).map((_, index) => (
              <div
                className={`${style.productBox} border bg-white rounded p-2 placeholder-glow`}
                key={index}
              >
                <div className="mb-2">
                  <div
                    className="placeholder bg-secondary w-100"
                    style={{ height: "230px" }}
                  />
                </div>
                <div className="productDetail">
                  <div className={`${style.ProductNameBox} mb-2`}>
                    <span className="placeholder col-8">&nbsp;</span>
                  </div>
                  <div className="d-flex align-items-center mb-2">
                    <span className="placeholder col-6 me-2">&nbsp;</span>
                  </div>
                  <div className="d-flex align-items-center">
                    <span className="placeholder col-6">&nbsp;</span>
                  </div>
                </div>
              </div>
            ))
          : displayProducts.map((product) => (
              <Link
                to={`/ProductDetail/${product.id}`}
                className="text-decoration-none text-dark"
                key={product.id}
              >
                <div className={`${style.productBox} border bg-white rounded`}>
                  <div className="position-relative">
                    <img
                      src={product.imageUrl}
                      className={`${style.productImg} rounded-top`}
                    />
                    <span
                      className={`${style.productDiscount} rounded fw-bold position-absolute`}
                    >
                      {product.discount}折
                    </span>
                  </div>
                  <div className="listProductDetail p-2">
                    <div className={style.productNameBox}>
                      <p className={`${style.productName} fw-bold`}>
                        {product.name}
                      </p>
                    </div>
                    <div className="listProductPriceBox d-flex mt-3 align-items-center">
                      <span className="text-danger me-2 fw-bold fs-5">
                        ${getDiscountPrice(product.discount, product.price)}
                      </span>
                      <span className="text-secondary">
                        <s>${product.price}</s>
                      </span>
                    </div>
                    <div className="d-flex mt-3">
                      <div
                        className={`${style.productStarBox} px-1 d-flex align-items-center`}
                      >
                        <img
                          src="/images/icons/home-star.png"
                          className={style.starIcon}
                        />
                        <span className="mx-1">{setStarNum(product.star)}</span>
                      </div>
                      <span className="mx-2">|</span>
                      <span>已售出 {product.sold}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
        <div className="text-center p-3">
          {/* 只在 loading 中顯示 spinner */}
          {!keyword&&listLoadingMore && hasMore && (
            <div className="spinner-border text-warning" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          )}

          {/* 獨立觀察元素，只在不是 loading 且還有更多資料時顯示 */}
          {!keyword&&!listLoadingMore && hasMore && (
            <div ref={observerRef} style={{ height: "100px" }} />
          )}
        </div>
      </div>
    </div>
  );
}
