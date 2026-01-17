import { useEffect, useState } from "react";
import { auth } from "./firebase";
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
} from "firebase/auth";
import Dashboard from "./pages/Dashboard";

function App() {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [confirmResult, setConfirmResult] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    auth.onAuthStateChanged((u) => setUser(u));

    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(
        auth,
        "recaptcha-container",
        { size: "invisible" }
      );
    }
  }, []);

  const sendCode = async () => {
    const res = await signInWithPhoneNumber(
      auth,
      phone,
      window.recaptchaVerifier
    );
    setConfirmResult(res);
  };

  const verifyCode = async () => {
    await confirmResult.confirm(code);
  };

  if (user) {
    return <Dashboard />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow w-full max-w-sm">
        <h2 className="text-xl font-semibold mb-6">
          Parent Login
        </h2>

        <input
          className="w-full border rounded px-3 py-2 mb-3"
          placeholder="+16505553434"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />

        <button
          className="w-full bg-black text-white py-2 rounded mb-4"
          onClick={sendCode}
        >
          Send Code
        </button>

        {confirmResult && (
          <>
            <input
              className="w-full border rounded px-3 py-2 mb-3"
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />

            <button
              className="w-full bg-green-600 text-white py-2 rounded"
              onClick={verifyCode}
            >
              Verify
            </button>
          </>
        )}

        <div id="recaptcha-container"></div>
      </div>
    </div>
  );
}

export default App;