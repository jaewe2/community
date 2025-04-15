import React, { useEffect, useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "./firebase";
import { useNavigate, Link } from "react-router-dom";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function Login() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  // ✅ Redirect if user is already logged in
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        navigate("/dashboard");
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  const LoginSchema = Yup.object().shape({
    email: Yup.string().email("Invalid email").required("Required"),
    password: Yup.string().min(6, "Min 6 characters").required("Required"),
  });

  const handleLogin = async (values, { setSubmitting }) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
      const token = await userCredential.user.getIdToken();

      const response = await fetch("http://127.0.0.1:8000/api/verify-token/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(`Welcome, ${data.email}`, {
          className: "custom-toast custom-toast-success",
          icon: "✅",
        });
        navigate("/dashboard");
      } else {
        toast.error(`Token rejected: ${data.error}`, {
          className: "custom-toast custom-toast-error",
          icon: "⚠️",
        });
      }
    } catch (error) {
      toast.error(`Login failed: ${error.message}`, {
        className: "custom-toast custom-toast-error",
        icon: "❌",
      });
    }

    setSubmitting(false);
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>Login</h2>
        <Formik
          initialValues={{ email: "", password: "" }}
          validationSchema={LoginSchema}
          onSubmit={handleLogin}
        >
          {({ isSubmitting }) => (
            <Form>
              <Field style={styles.input} type="email" name="email" placeholder="Email" />
              <ErrorMessage name="email" component="div" style={styles.error} />

              <div style={styles.passwordGroup}>
                <Field
                  style={styles.input}
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Password"
                />
                <span
                  style={styles.toggle}
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  {showPassword ? "Hide" : "Show"}
                </span>
              </div>
              <ErrorMessage name="password" component="div" style={styles.error} />

              <button style={styles.button} type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Logging in..." : "Log In"}
              </button>

              <p style={styles.link}>
                Need an account? <Link to="/register">Register here</Link>
              </p>
            </Form>
          )}
        </Formik>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    height: "100vh",
    alignItems: "center",
    justifyContent: "center",
    background: "#f2f2f2",
  },
  card: {
    background: "#fff",
    padding: "2rem",
    borderRadius: "8px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
    width: "300px",
    textAlign: "center",
  },
  title: {
    marginBottom: "1.5rem",
  },
  input: {
    display: "block",
    width: "100%",
    padding: "10px",
    border: "1px solid #ccc",
    borderRadius: "4px",
  },
  passwordGroup: {
    position: "relative",
    marginBottom: "1rem",
  },
  toggle: {
    position: "absolute",
    right: "10px",
    top: "50%",
    transform: "translateY(-50%)",
    fontSize: "0.8rem",
    color: "#007bff",
    cursor: "pointer",
    userSelect: "none",
  },
  button: {
    width: "100%",
    padding: "10px",
    background: "#007bff",
    color: "#fff",
    border: "none",
    borderRadius: "4px",
    fontWeight: "bold",
    cursor: "pointer",
  },
  link: {
    marginTop: "1rem",
    fontSize: "0.9rem",
  },
  error: {
    color: "crimson",
    fontSize: "0.8rem",
    marginBottom: "0.5rem",
    textAlign: "left",
  },
};
