import { useState, useEffect } from "react";

export function usePhoneNumbers() {
  const [phoneNumbers, setPhoneNumbers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/user/phone-numbers")
      .then((res) => res.json())
      .then((data) => {
        setPhoneNumbers(data);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  const refresh = () => {
    fetch("/api/user/phone-numbers")
      .then((res) => res.json())
      .then((data) => setPhoneNumbers(data));
  };

  return { phoneNumbers, isLoading, refresh };
}
