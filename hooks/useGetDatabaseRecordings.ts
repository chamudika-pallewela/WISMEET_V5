import { useEffect, useState } from "react";

export const useGetDatabaseRecordings = (userId: string) => {
  const [recordings, setRecordings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRecordings = async () => {
    if (!userId) return;
    try {
      setIsLoading(true);
      const res = await fetch(`/api/recordings?createdBy=${userId}`);
      const data = await res.json();
      setRecordings(data.recordings || []);
    } catch (err) {
      console.error("Error fetching recordings:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecordings();
  }, [userId]);

  return { recordings, isLoading, refetchRecordings: fetchRecordings };
};
