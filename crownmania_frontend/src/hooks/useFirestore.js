import { useState, useEffect } from 'react';
import { fetchCollection, fetchFilteredCollection } from '../utils/firestoreUtils';

export const useFirestore = (collectionName, options = {}) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const {
    filters = [],
    orderBy: orderByField = null,
    orderDirection = 'desc',
    limit: limitCount = null,
    realtime = false
  } = options;

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        let result;
        
        if (filters.length > 0 || orderByField || limitCount) {
          result = await fetchFilteredCollection(
            collectionName,
            filters,
            orderByField,
            orderDirection,
            limitCount
          );
        } else {
          result = await fetchCollection(collectionName);
        }
        
        setData(result);
        setError(null);
      } catch (err) {
        setError(err.message);
        console.error('Error in useFirestore:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [collectionName, JSON.stringify(filters), orderByField, orderDirection, limitCount]);

  const refresh = async () => {
    try {
      setLoading(true);
      const result = await fetchCollection(collectionName);
      setData(result);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Error refreshing data:', err);
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, refresh };
};
