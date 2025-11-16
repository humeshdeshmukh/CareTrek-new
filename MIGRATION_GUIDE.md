# Firebase to Supabase Migration Guide

This guide will help you complete the migration from Firebase to Supabase.

## 1. Environment Variables

Create a `.env` file in your project root and add the following variables:

```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 2. Database Schema Migration

1. Export your Firebase Firestore data
2. Set up equivalent tables in Supabase
3. Import your data into Supabase tables

## 3. Authentication Migration

1. Set up authentication providers in Supabase dashboard
2. Update authentication methods in your code:
   - Replace `auth().signInWithEmailAndPassword` with `supabase.auth.signInWithPassword`
   - Replace `auth().createUserWithEmailAndPassword` with `supabase.auth.signUp`
   - Replace `auth().signOut()` with `supabase.auth.signOut()`

## 4. Firestore to Supabase Database

Update your database operations:

### Reading Data
```typescript
// Before (Firestore)
const snapshot = await firestore().collection('users').doc(userId).get();

// After (Supabase)
const { data, error } = await supabase
  .from('users')
  .select('*')
  .eq('id', userId)
  .single();
```

### Writing Data
```typescript
// Before (Firestore)
await firestore().collection('users').doc(userId).set(userData);

// After (Supabase)
const { data, error } = await supabase
  .from('users')
  .upsert({ id: userId, ...userData });
```

## 5. Storage Migration

### Uploading Files
```typescript
// Before (Firebase Storage)
const reference = storage().ref('images/avatar.jpg');
await reference.putFile(localFilePath);

// After (Supabase Storage)
const { data, error } = await supabase.storage
  .from('avatars')
  .upload('public/avatar.jpg', file);
```

### Downloading Files
```typescript
// Before (Firebase Storage)
const url = await storage().ref('images/avatar.jpg').getDownloadURL();

// After (Supabase Storage)
const { data } = supabase.storage
  .from('avatars')
  .getPublicUrl('public/avatar.jpg');
const url = data.publicUrl;
```

## 6. Real-time Subscriptions

```typescript
// Before (Firestore)
const unsubscribe = firestore()
  .collection('messages')
  .onSnapshot(snapshot => {
    // Handle updates
  });

// After (Supabase)
const subscription = supabase
  .channel('messages')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'messages' },
    (payload) => {
      // Handle updates
    }
  )
  .subscribe();

// To unsubscribe
subscription.unsubscribe();
```

## 7. Cleanup

After migration is complete, you can remove these Firebase dependencies:
- @react-native-firebase/app
- @react-native-firebase/auth
- @react-native-firebase/firestore
- @react-native-firebase/storage
- firebase
- expo-firebase-analytics
- expo-firebase-core

## 8. Testing

Thoroughly test all features that used Firebase services to ensure they work as expected with Supabase.
