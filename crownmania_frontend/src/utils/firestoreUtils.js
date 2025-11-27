import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Fetch all documents from a Firestore collection
 * @param {string} collectionName - Name of the collection to fetch from
 * @returns {Promise<Array>} Array of documents
 */
export const fetchCollection = async (collectionName) => {
  try {
    const querySnapshot = await getDocs(collection(db, collectionName));
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error(`Error fetching ${collectionName}:`, error);
    throw error;
  }
};

/**
 * Fetch documents from a collection with filters
 * @param {string} collectionName - Name of the collection
 * @param {Array} filters - Array of filter objects [{ field, operator, value }]
 * @param {string} orderByField - Field to order by
 * @param {string} orderDirection - 'asc' or 'desc'
 * @param {number} limitCount - Number of documents to fetch
 * @returns {Promise<Array>} Array of filtered documents
 */
export const fetchFilteredCollection = async (
  collectionName,
  filters = [],
  orderByField = null,
  orderDirection = 'desc',
  limitCount = null
) => {
  try {
    let q = collection(db, collectionName);

    // Apply filters
    filters.forEach(({ field, operator, value }) => {
      q = query(q, where(field, operator, value));
    });

    // Apply ordering
    if (orderByField) {
      q = query(q, orderBy(orderByField, orderDirection));
    }

    // Apply limit
    if (limitCount) {
      q = query(q, limit(limitCount));
    }

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error(`Error fetching filtered ${collectionName}:`, error);
    throw error;
  }
};

/**
 * Fetch documents from multiple collections
 * @param {Array} collections - Array of collection names to fetch
 * @returns {Promise<Object>} Object with collection names as keys and document arrays as values
 */
export const fetchMultipleCollections = async (collections) => {
  try {
    const results = {};
    await Promise.all(
      collections.map(async (collectionName) => {
        results[collectionName] = await fetchCollection(collectionName);
      })
    );
    return results;
  } catch (error) {
    console.error('Error fetching multiple collections:', error);
    throw error;
  }
};
