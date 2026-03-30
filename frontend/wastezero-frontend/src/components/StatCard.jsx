function StatCard({title,value}){
 return(
   <div style={{
     background:"white",
     padding:"20px",
     borderRadius:"10px",
     margin:"10px"
   }}>
     <h4>{title}</h4>
     <h2>{value}</h2>
   </div>
 );
}
export default StatCard;