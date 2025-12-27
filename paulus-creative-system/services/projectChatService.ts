
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { ChatMessage, UserWorkStatus, ProjectPresence } from '../types';

/**
 * PAULUS.AI — PROJECT COMMUNICATION SERVICE (PRODUCTION v1.5)
 * 
 * [SECURITY UPDATE - RLS v2]:
 * - Membership Hardening: ACCESS DENIED unless user_id exists in 'project_members' table for the given project_id.
 * - Roles: OWNER, MEMBER, VIEWER enforced at DB level via RLS policies.
 * - Auth: user_id must match auth.uid().
 * - Sync: Realtime filtering automatically applied via RLS 'EXISTS' clauses.
 */

class ProjectChatService {
  private supabase: SupabaseClient | null = null;

  constructor() {
    const supabaseUrl = (process.env as any).SUPABASE_URL || '';
    const supabaseKey = (process.env as any).SUPABASE_KEY || '';
    
    if (supabaseUrl && supabaseKey) {
      this.supabase = createClient(supabaseUrl, supabaseKey);
    } else {
      console.warn('[ChatService] Supabase credentials missing. Real-time features disabled.');
    }
  }

  private get client(): any {
    if (!this.supabase) {
      /**
       * Robust mock query generator that mimics Supabase's chainable API.
       * Returns a Promise that resolves to a safe empty state, while
       * providing mock methods for all common chain operations.
       */
      const createMockQuery = () => {
        const mock: any = Promise.resolve({ data: [], error: null });
        const chainableMethods = [
          'from', 'select', 'eq', 'order', 'limit', 'insert', 'upsert', 
          'delete', 'update', 'channel', 'on', 'subscribe', 'rpc', 'range', 'single'
        ];
        chainableMethods.forEach(method => {
          mock[method] = () => createMockQuery();
        });
        return mock;
      };

      const mockClient = createMockQuery();
      mockClient.storage = {
        from: () => ({
          upload: () => Promise.resolve({ data: {}, error: null }),
          getPublicUrl: () => ({ data: { publicUrl: '' } })
        })
      };
      mockClient.removeChannel = () => {};
      return mockClient;
    }
    return this.supabase;
  }

  // --- CHAT API ---

  public async connect(projectId: string): Promise<ChatMessage[]> {
    const { data, error } = await this.client
      .from('project_chat_messages')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })
      .limit(50);

    if (error) {
      console.error('[ChatService] Fetch failed (Check RLS/Membership):', error);
      return [];
    }

    return (data || []).map((row: any) => this.mapDbToType(row));
  }

  public subscribe(projectId: string, onMessage: (message: ChatMessage) => void) {
    const channel = this.client
      .channel(`project-chat-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'project_chat_messages',
          filter: `project_id=eq.${projectId}`
        },
        (payload: any) => {
          onMessage(this.mapDbToType(payload.new));
        }
      )
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          console.debug(`[ChatService] Realtime active for member of project: ${projectId}`);
        }
      });

    return () => {
      if (this.supabase) {
        this.supabase.removeChannel(channel);
      } else {
        this.client.removeChannel(channel);
      }
    };
  }

  public async sendMessage(projectId: string, message: ChatMessage) {
    const { error } = await this.client
      .from('project_chat_messages')
      .insert([{
        project_id: projectId,
        user_id: message.userId,
        type: message.type,
        text: message.text,
        file_url: message.fileUrl,
        file_name: message.fileName
      }]);

    if (error) {
      console.error('[ChatService] Send failed (Check RLS/Membership):', error);
      throw error;
    }
  }

  public async uploadFile(projectId: string, file: File): Promise<{ url: string, name: string }> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${projectId}/${Date.now()}.${fileExt}`;
    const filePath = `uploads/${fileName}`;

    const { error: uploadError } = await this.client.storage
      .from('chat-assets')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = this.client.storage
      .from('chat-assets')
      .getPublicUrl(filePath);

    return {
      url: data.publicUrl,
      name: file.name
    };
  }

  // --- PRESENCE API ---

  public async updatePresence(
    projectId: string, 
    userId: string, 
    status: UserWorkStatus, 
    location?: { lat: number; lng: number }
  ): Promise<void> {
    const { error } = await this.client
      .from('project_presence')
      .upsert({
        project_id: projectId,
        user_id: userId,
        status: status,
        last_location_lat: location?.lat,
        last_location_lng: location?.lng,
        last_changed_at: new Date().toISOString()
      }, { onConflict: 'project_id,user_id' });

    if (error) {
      console.error('[ChatService] Presence update failed (Check RLS/Membership):', error);
      throw error;
    }
  }

  public subscribePresence(
    projectId: string, 
    callback: (presenceList: ProjectPresence[]) => void
  ) {
    this.client
      .from('project_presence')
      .select('*')
      .eq('project_id', projectId)
      .order('last_changed_at', { ascending: false })
      .then(({ data, error }: any) => {
        if (error) console.error('[ChatService] Presence snapshot failed:', error);
        if (data) callback(data.map((row: any) => this.mapDbToPresence(row)));
      });

    const channel = this.client
      .channel(`project-presence-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'project_presence',
          filter: `project_id=eq.${projectId}`
        },
        async () => {
          const { data } = await this.client
            .from('project_presence')
            .select('*')
            .eq('project_id', projectId)
            .order('last_changed_at', { ascending: false });
          
          if (data) callback(data.map((row: any) => this.mapDbToPresence(row)));
        }
      )
      .subscribe();

    return () => {
      if (this.supabase) {
        this.supabase.removeChannel(channel);
      } else {
        this.client.removeChannel(channel);
      }
    };
  }

  private mapDbToType(row: any): ChatMessage {
    return {
      id: row.id,
      projectId: row.project_id,
      userId: row.user_id,
      text: row.text,
      fileUrl: row.file_url,
      fileName: row.file_name,
      timestamp: row.created_at,
      type: row.type as 'TEXT' | 'FILE' | 'AI_GENERATED'
    };
  }

  private mapDbToPresence(row: any): ProjectPresence {
    return {
      userId: row.user_id,
      status: row.status as UserWorkStatus,
      lastChangedAt: row.last_changed_at,
      lastLocation: row.last_location_lat ? {
        lat: row.last_location_lat,
        lng: row.last_location_lng
      } : undefined
    };
  }
}

export const projectChatService = new ProjectChatService();
