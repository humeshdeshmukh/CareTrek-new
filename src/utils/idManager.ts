import AsyncStorage from '@react-native-async-storage/async-storage';

const SENIOR_ID_KEY = '@CareTrek:seniorId';
const FAMILY_MEMBERS_KEY = '@CareTrek:familyMembers';

// Generate a unique ID if one doesn't exist
export const getOrCreateSeniorId = async (): Promise<string> => {
  try {
    let id = await AsyncStorage.getItem(SENIOR_ID_KEY);
    
    if (!id) {
      // Generate a new ID if one doesn't exist
      id = 'CT' + Math.random().toString(36).substring(2, 10).toUpperCase();
      await AsyncStorage.setItem(SENIOR_ID_KEY, id);
    }
    
    return id;
  } catch (error) {
    console.error('Error getting/setting senior ID:', error);
    // Fallback to a random ID if storage fails
    return 'CT' + Math.random().toString(36).substring(2, 10).toUpperCase();
  }
};

// Family member management
export const getFamilyMembers = async (): Promise<Array<{id: string, email: string, name: string}>> => {
  try {
    const members = await AsyncStorage.getItem(FAMILY_MEMBERS_KEY);
    return members ? JSON.parse(members) : [];
  } catch (error) {
    console.error('Error getting family members:', error);
    return [];
  }
};

export const addFamilyMember = async (email: string, name: string): Promise<boolean> => {
  try {
    const members = await getFamilyMembers();
    const id = 'mem' + Math.random().toString(36).substring(2, 9);
    const newMember = { id, email, name };
    
    // Check if member already exists
    if (members.some(m => m.email === email)) {
      return false;
    }
    
    await AsyncStorage.setItem(
      FAMILY_MEMBERS_KEY,
      JSON.stringify([...members, newMember])
    );
    
    return true;
  } catch (error) {
    console.error('Error adding family member:', error);
    return false;
  }
};

export const removeFamilyMember = async (id: string): Promise<boolean> => {
  try {
    const members = await getFamilyMembers();
    const updatedMembers = members.filter(member => member.id !== id);
    
    await AsyncStorage.setItem(
      FAMILY_MEMBERS_KEY,
      JSON.stringify(updatedMembers)
    );
    
    return true;
  } catch (error) {
    console.error('Error removing family member:', error);
    return false;
  }
};
