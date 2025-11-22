import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Modal,
    TextInput,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../../contexts/theme/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useConnectedSenior } from '../../../hooks/useConnectedSenior';
import { seniorDataService } from '../../../services/seniorDataService';
import { supabase } from '../../../lib/supabase';

const SeniorNotesScreen = () => {
    const { colors } = useTheme();
    const navigation = useNavigation();
    const { senior, loading: seniorLoading, noSeniors } = useConnectedSenior();

    const [notes, setNotes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [currentNote, setCurrentNote] = useState({ id: '', content: '' });
    const [isEditing, setIsEditing] = useState(false);
    const [currentUser, setCurrentUser] = useState<string | null>(null);

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (user) setCurrentUser(user.id);
        });
    }, []);

    useEffect(() => {
        if (senior && currentUser) {
            fetchNotes();
        }
    }, [senior, currentUser]);

    const fetchNotes = async () => {
        if (!senior || !currentUser) return;
        try {
            setLoading(true);
            // Fetch data where type is 'note'
            // Note: seniorDataService.getSeniorData returns all data. 
            // We might need to filter it or use a more specific query if the service allows.
            // For now, we'll fetch all and filter client-side or assume the service handles it.
            // Actually, let's look at seniorDataService. It fetches from 'senior_data'.
            // We should probably filter by a 'type' field inside the JSON 'data' column.

            const allData = await seniorDataService.getSeniorData(senior.id, currentUser);
            const notesData = allData.filter((item: any) => item.data && item.data.type === 'note');

            // Sort by created_at desc
            notesData.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

            setNotes(notesData);
        } catch (error) {
            console.error('Error fetching notes:', error);
            Alert.alert('Error', 'Failed to load notes');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveNote = async () => {
        if (!currentNote.content.trim()) {
            Alert.alert('Error', 'Note content cannot be empty');
            return;
        }
        if (!senior || !currentUser) return;

        try {
            setLoading(true);
            const notePayload = {
                type: 'note',
                content: currentNote.content,
                timestamp: new Date().toISOString()
            };

            await seniorDataService.saveSeniorData(
                senior.id,
                currentUser,
                notePayload,
                isEditing ? currentNote.id : undefined
            );

            setModalVisible(false);
            setCurrentNote({ id: '', content: '' });
            await fetchNotes();
            Alert.alert('Success', `Note ${isEditing ? 'updated' : 'added'} successfully`);
        } catch (error) {
            console.error('Error saving note:', error);
            Alert.alert('Error', 'Failed to save note');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteNote = (id: string) => {
        Alert.alert(
            'Delete Note',
            'Are you sure you want to delete this note?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await seniorDataService.deleteSeniorData(id);
                            await fetchNotes();
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete note');
                        }
                    }
                }
            ]
        );
    };

    const openAddModal = () => {
        setIsEditing(false);
        setCurrentNote({ id: '', content: '' });
        setModalVisible(true);
    };

    const openEditModal = (note: any) => {
        setIsEditing(true);
        setCurrentNote({ id: note.id, content: note.data.content });
        setModalVisible(true);
    };

    const renderItem = ({ item }: { item: any }) => (
        <View style={[styles.card, { backgroundColor: colors.card }]}>
            <View style={styles.cardContent}>
                <Text style={[styles.noteText, { color: colors.text }]}>{item.data.content}</Text>
                <Text style={[styles.dateText, { color: colors.textSecondary }]}>
                    {new Date(item.created_at).toLocaleString()}
                </Text>
            </View>
            <View style={styles.cardActions}>
                <TouchableOpacity onPress={() => openEditModal(item)} style={styles.actionBtn}>
                    <Ionicons name="pencil" size={20} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDeleteNote(item.id)} style={styles.actionBtn}>
                    <Ionicons name="trash-outline" size={20} color="#EF4444" />
                </TouchableOpacity>
            </View>
        </View>
    );

    if (seniorLoading || (loading && !notes.length)) {
        return (
            <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (noSeniors) {
        return (
            <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
                <Text style={{ color: colors.textSecondary }}>No seniors connected</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>
                    Notes for {senior?.name}
                </Text>
                <TouchableOpacity onPress={openAddModal} style={styles.addButton}>
                    <Ionicons name="add" size={24} color={colors.primary} />
                </TouchableOpacity>
            </View>

            <FlatList
                data={notes}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Text style={{ color: colors.textSecondary }}>No notes yet</Text>
                    </View>
                }
            />

            <Modal
                visible={modalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setModalVisible(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={styles.modalContainer}
                >
                    <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>
                                {isEditing ? 'Edit Note' : 'Add Note'}
                            </Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Ionicons name="close" size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.modalBody}>
                            <TextInput
                                style={[styles.input, {
                                    backgroundColor: colors.background,
                                    color: colors.text,
                                    borderColor: colors.border
                                }]}
                                value={currentNote.content}
                                onChangeText={(text) => setCurrentNote({ ...currentNote, content: text })}
                                placeholder="Enter note content..."
                                placeholderTextColor={colors.textSecondary}
                                multiline
                                autoFocus
                            />
                        </View>

                        <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
                            <TouchableOpacity
                                style={[styles.modalButton, { backgroundColor: colors.border }]}
                                onPress={() => setModalVisible(false)}
                            >
                                <Text style={[styles.modalButtonText, { color: colors.text }]}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, { backgroundColor: colors.primary }]}
                                onPress={handleSaveNote}
                            >
                                <Text style={[styles.modalButtonText, { color: 'white' }]}>Save</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    center: { justifyContent: 'center', alignItems: 'center' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: 1,
    },
    backButton: { padding: 8, marginLeft: -8 },
    headerTitle: { fontSize: 18, fontWeight: '600' },
    addButton: { padding: 8, marginRight: -8 },
    list: { padding: 16 },
    card: {
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    cardContent: { flex: 1, marginRight: 12 },
    noteText: { fontSize: 16, marginBottom: 4 },
    dateText: { fontSize: 12 },
    cardActions: { flexDirection: 'row' },
    actionBtn: { padding: 8 },
    emptyState: { alignItems: 'center', marginTop: 40 },
    modalContainer: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContent: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
    },
    modalTitle: { fontSize: 18, fontWeight: '700' },
    modalBody: { padding: 16 },
    input: {
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        minHeight: 100,
        textAlignVertical: 'top',
    },
    modalFooter: {
        flexDirection: 'row',
        padding: 16,
        borderTopWidth: 1,
        gap: 12,
    },
    modalButton: {
        flex: 1,
        padding: 14,
        borderRadius: 8,
        alignItems: 'center',
    },
    modalButtonText: { fontWeight: '600', fontSize: 16 },
});

export default SeniorNotesScreen;
