import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export type ConnectedSenior = {
    id: string;
    name: string;
    email?: string;
    phone?: string;
};

export const useConnectedSenior = () => {
    const [senior, setSenior] = useState<ConnectedSenior | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [noSeniors, setNoSeniors] = useState(false);

    useEffect(() => {
        const fetchSenior = async () => {
            try {
                setLoading(true);
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    setLoading(false);
                    return;
                }

                // Fetch the first connected senior
                const { data: relationships, error: relError } = await supabase
                    .from('family_relationships')
                    .select('senior_user_id')
                    .eq('family_member_id', user.id);

                if (relError) throw relError;

                if (relationships && relationships.length > 0) {
                    const firstSeniorId = relationships[0].senior_user_id;

                    // Fetch senior profile details
                    const { data: profile, error: profileError } = await supabase
                        .from('user_profiles')
                        .select('full_name, email, phone')
                        .eq('id', firstSeniorId)
                        .maybeSingle();

                    // If profile fetch fails, we might still want to return the ID
                    // but let's log it.
                    if (profileError) console.warn('Error fetching senior profile:', profileError);

                    setSenior({
                        id: firstSeniorId,
                        name: profile?.full_name || 'Senior',
                        email: profile?.email,
                        phone: profile?.phone
                    });
                    setNoSeniors(false);
                } else {
                    setNoSeniors(true);
                    setSenior(null);
                }
            } catch (err: any) {
                console.error('Error in useConnectedSenior:', err);
                setError(err.message || 'Failed to load connected senior');
            } finally {
                setLoading(false);
            }
        };

        fetchSenior();
    }, []);

    return { senior, loading, error, noSeniors };
};
