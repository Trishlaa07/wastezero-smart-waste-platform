import { useState } from "react";
import Layout from "../components/Layout";
import { Search, Mail, Phone, Book, ChevronDown, ChevronUp, MessageCircle, Send, CheckCircle } from "lucide-react";
import "../styles/settingsSupport.css";
import axios from "axios";

const Support = () => {
  const user = JSON.parse(localStorage.getItem("user")) || { name: "User", role: "volunteer" };
  const isNGO = user.role === "ngo";

  const [searchQuery, setSearchQuery] = useState("");
  const [faqs, setFaqs] = useState([
    { 
      id: 1, 
      q: "How do I schedule a pickup?", 
      a: "Go to the 'Schedule Pickup' section from your sidebar, fill in your address, waste type, and preferred time slot, then click schedule.", 
      open: false 
    },
    { 
      id: 2, 
      q: "How are impact points calculated?", 
      a: "Points are awarded based on the weight and type of waste successfully collected and verified by our NGO partners.", 
      open: false 
    },
    { 
      id: 3, 
      q: "Can I cancel a scheduled pickup?", 
      a: "Yes, you can cancel any pending pickup from your history tab at least 2 hours before the scheduled time.", 
      open: false 
    },
    { 
      id: 4, 
      q: isNGO ? "How do I review applications?" : "How do NGOs match with volunteers?", 
      a: isNGO 
        ? "Visit the 'View Applications' page. You can click on any volunteer's name to see their details and then Accept or Reject the application."
        : "Our system uses an intelligent matching algorithm that compares NGO skill requirements with volunteer profiles to find the best fit.", 
      open: false 
    }
  ]);

  const [contactForm, setContactForm] = useState({ subject: "", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const toggleFaq = (id) => {
    setFaqs(prev => prev.map(f => f.id === id ? { ...f, open: !f.open } : f));
  };

  const filteredFaqs = faqs.filter(f => 
    f.q.toLowerCase().includes(searchQuery.toLowerCase()) || 
    f.a.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleContactSubmit = async (e) => {
    e.preventDefault();

    if (!contactForm.subject || !contactForm.message) return;

    setIsSubmitting(true);

    try {
      const res = await axios.post(
        "http://localhost:5001/api/support/message",
        {
          subject: contactForm.subject,
          message: contactForm.message,
          user: user
        }
      );

      console.log("Response:", res.data);

      setSubmitted(true);
      setContactForm({ subject: "", message: "" });

      setTimeout(() => setSubmitted(false), 5000);

    } catch (err) {
      console.error("Error:", err);
      alert("Failed to send message");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className={isNGO ? "ngo-container" : "vol-container"}>
        <div className={isNGO ? "ngo-header" : "vol-header"}>
          <div>
            <h2 className={isNGO ? "ngo-dashboard-title" : "dashboard-title"}>Help & Support</h2>
            <p className={isNGO ? "ngo-welcome" : "dashboard-welcome"}>
              Get help with the {isNGO ? "NGO portal" : "platform"} and find answers to common questions
            </p>
          </div>
        </div>

        <div className="support-hero">
          <h3>How can we help you today?</h3>
          <div className="support-search">
            <Search className="search-icon" size={18} />
            <input 
              type="text" 
              placeholder="Search for help topics, FAQs, guides..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="settings-grid">
          {/* FAQs */}
          <div className="settings-card" style={{ gridColumn: "span 2" }}>
            <h3><Book size={18} /> Frequently Asked Questions</h3>
            <div className="faq-list">
              {filteredFaqs.length > 0 ? (
                filteredFaqs.map(faq => (
                  <div 
                    key={faq.id} 
                    className="faq-item" 
                    onClick={() => toggleFaq(faq.id)}
                  >
                    <div className="faq-question">
                      {faq.q}
                      {faq.open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                    {faq.open && <div className="faq-answer">{faq.a}</div>}
                  </div>
                ))
              ) : (
                <p className="setting-desc" style={{ textAlign: "center", padding: "20px" }}>
                  No results found for "{searchQuery}"
                </p>
              )}
            </div>
          </div>

          {/* Contact Methods */}
          <div className="contact-card">
            <div className="contact-icon"><Mail size={24} /></div>
            <span className="setting-title">Email Support</span>
            <span className="setting-desc">support@wastezero.com</span>
            <a 
              href="mailto:support@wastezero.com" 
              className="vol-browse-btn" 
              style={{ background: "#f0fdf4", color: "#11635c", marginTop: "10px", textDecoration: "none" }}
            >
              Send Email
            </a>
          </div>

          <div className="contact-card">
            <div className="contact-icon"><Phone size={24} /></div>
            <span className="setting-title">Phone Support</span>
            <span className="setting-desc">+91 9876543210</span>
            <a 
              href="tel:+15551234567" 
              className="vol-browse-btn" 
              style={{ background: "#f0fdf4", color: "#11635c", marginTop: "10px", textDecoration: "none" }}
            >
              Call Now
            </a>
          </div>

          {/* Contact Form */}
          <div className="settings-card" style={{ gridColumn: "span 2" }}>
            <h3><MessageCircle size={18} /> Send us a Message</h3>
            {submitted ? (
              <div className="support-success">
                <CheckCircle size={32} color="#11635c" />
                <h4>Message Sent!</h4>
                <p>We've received your request and will get back to you within 24 hours.</p>
                <button className="vol-browse-btn" onClick={() => setSubmitted(false)}>Send another message</button>
              </div>
            ) : (
              <form className="support-form" onSubmit={handleContactSubmit}>
                <div className="sp-field">
                  <label>Subject</label>
                  <input 
                    type="text" 
                    placeholder="What do you need help with?" 
                    value={contactForm.subject}
                    onChange={(e) => setContactForm({...contactForm, subject: e.target.value})}
                    required
                  />
                </div>
                <div className="sp-field">
                  <label>Message</label>
                  <textarea 
                    placeholder="Provide details about your issue..."
                    value={contactForm.message}
                    onChange={(e) => setContactForm({...contactForm, message: e.target.value})}
                    required
                  />
                </div>
                <button type="submit" className="vol-browse-btn" disabled={isSubmitting}>
                  {isSubmitting ? "Sending..." : <><Send size={14} /> Send Message</>}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Support;
