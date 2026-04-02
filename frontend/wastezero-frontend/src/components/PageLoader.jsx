import "../styles/PageLoader.css";

function PageLoader() {
  return (
    <div className="pageloader-overlay">
      <div className="recycle-spinner">♻</div>
      <p className="pageloader-text">Loading...</p>
    </div>
  );
}

export default PageLoader;