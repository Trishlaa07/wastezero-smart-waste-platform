import "../styles/PageLoader.css";

function PageLoader({ text = "Loading..." }) {
  return (
    <div className="page-loader">
      <div className="loader-content">
        <div className="loader-ring">
          <div /><div /><div /><div />
        </div>
        <p className="loader-text">{text}</p>
      </div>
    </div>
  );
}

export default PageLoader;
