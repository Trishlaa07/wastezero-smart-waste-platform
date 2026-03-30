import Layout from "../../components/Layout";
import { useEffect, useState } from "react";
import axios from "axios";
import "../../styles/platformControl.css";

function PlatformControl() {

  const [stats, setStats] = useState(null);
  const [suspendedUsers, setSuspendedUsers] = useState([]);
  const [recentPosts, setRecentPosts] = useState([]);
  const [reportedPosts, setReportedPosts] = useState([]);

  const token = localStorage.getItem("token");

  /* =========================
      FETCH PLATFORM DATA
  ========================== */
  const fetchPlatformData = async () => {

    try {

      const headers = {
        Authorization: `Bearer ${token}`
      };

      const statsRes = await axios.get(
        "http://localhost:5001/api/admin/stats",
        { headers }
      );

      const usersRes = await axios.get(
        "http://localhost:5001/api/admin/users",
        { headers }
      );

      const postsRes = await axios.get(
        "http://localhost:5001/api/admin/posts",
        { headers }
      );

      setStats(statsRes.data);

      const suspended = usersRes.data.filter(
        (u) => u.isSuspended === true
      );

      setSuspendedUsers(suspended);

      const reported = postsRes.data.filter(
        (p) => p.isReported === true
      );

      setReportedPosts(reported);

      setRecentPosts(postsRes.data.slice(0, 5));

    } catch (error) {

      console.log("Platform Control Error:", error);

    }

  };

  useEffect(() => {
    fetchPlatformData();
  }, []);

  /* =========================
        UNSUSPEND USER
  ========================== */
  const unsuspendUser = async (id) => {

    try {

      await axios.put(
        `http://localhost:5001/api/admin/users/${id}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      alert("User reactivated");

      fetchPlatformData();

    } catch (error) {

      console.log(error);

    }

  };

  /* =========================
        DELETE POST
  ========================== */
  const deletePost = async (id) => {

    const reason = prompt("Enter deletion reason");

    if (!reason) return;

    try {

      await axios.delete(
        `http://localhost:5001/api/admin/posts/${id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          },
          data: { reason }
        }
      );

      alert("Post deleted");

      fetchPlatformData();

    } catch (error) {

      console.log(error);

    }

  };

  if (!stats) {
    return (
      <Layout>
        <h2>Platform Control</h2>
        <p>Loading platform data...</p>
      </Layout>
    );
  }

  return (
    <Layout>

      <h2>Platform Control Center</h2>

      {/* ================= STATS ================= */}

      <div className="platform-stats">

        <div className="platform-stat-card">
          <h3>Total Users</h3>
          <p>{stats.totalUsers}</p>
        </div>

        <div className="platform-stat-card">
          <h3>Total NGOs</h3>
          <p>{stats.totalNGOs}</p>
        </div>

        <div className="platform-stat-card">
          <h3>Opportunities</h3>
          <p>{stats.totalOpportunities}</p>
        </div>

        <div className="platform-stat-card">
          <h3>Suspended Users</h3>
          <p>{stats.suspendedUsers}</p>
        </div>

      </div>

      {/* ================= SUSPENDED USERS ================= */}

      <div className="platform-section">

        <h3>Suspended Users</h3>

        {suspendedUsers.length === 0 ? (
          <p>No suspended users</p>
        ) : (

          <table className="platform-table">

            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Reason</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>

              {suspendedUsers.map((user) => (

                <tr key={user._id}>

                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>{user.suspensionReason}</td>

                  <td>

                    <button
                      className="unsuspend-btn"
                      onClick={() =>
                        unsuspendUser(user._id)
                      }
                    >
                      Reactivate
                    </button>

                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        )}

      </div>

      {/* ================= REPORTED POSTS ================= */}

      <div className="platform-section">

        <h3>Reported Opportunities</h3>

        {reportedPosts.length === 0 ? (
          <p>No reported posts</p>
        ) : (

          <div className="post-grid">

            {reportedPosts.map((post) => (

              <div
                key={post._id}
                className="platform-post-card"
              >

                <h4>{post.title}</h4>

                <p>
                  {post.description?.substring(0, 120)}
                </p>

                <span>
                  NGO: {post.ngo?.name}
                </span>

                <p className="report-reason">
                  Reason: {post.reportReason}
                </p>

                <button
                  className="delete-post-btn"
                  onClick={() =>
                    deletePost(post._id)
                  }
                >
                  Delete Post
                </button>

              </div>

            ))}

          </div>

        )}

      </div>

      {/* ================= RECENT POSTS ================= */}

      <div className="platform-section">

        <h3>Recent Opportunities</h3>

        <div className="post-grid">

          {recentPosts.map((post) => (

            <div
              key={post._id}
              className="platform-post-card"
            >

              <h4>{post.title}</h4>

              <p>
                {post.description?.substring(0, 120)}
              </p>

              <span>
                NGO: {post.ngo?.name}
              </span>

            </div>

          ))}

        </div>

      </div>

    </Layout>
  );
}

export default PlatformControl;