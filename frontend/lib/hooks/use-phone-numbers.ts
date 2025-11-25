import { useState, useEffect } from "react";

export function usePhoneNumbers() {
  const [phoneNumbers, setPhoneNumbers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/user/phone-numbers")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        // API returns { success: true, data: [...] }
        setPhoneNumbers(data.data || []);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch phone numbers:", err);
        setPhoneNumbers([]);
        setIsLoading(false);
      });
  }, []);

  const refresh = () => {
    fetch("/api/user/phone-numbers")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => setPhoneNumbers(data.data || []))
      .catch((err) => {
        console.error("Failed to refresh phone numbers:", err);
        setPhoneNumbers([]);
      });
  };

  return { phoneNumbers, isLoading, refresh };
}
