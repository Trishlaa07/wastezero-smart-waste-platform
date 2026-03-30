import "../styles/card.css";

function Card({ title, value, icon: Icon }) {
  return (
    <div className="dashboard-card">
      <div className="card-top">
        {Icon && <Icon size={22} className="card-icon" />}
        <span className="card-title">{title}</span>
      </div>

      <h2 className="card-value">{value}</h2>
    </div>
  );
}

export default Card;