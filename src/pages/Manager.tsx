import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, Users, Settings, Database, Eye, EyeOff } from 'lucide-react';

interface UserSubmission {
  id: string;
  platform: string;
  username: string;
  video_link?: string;
  follow_account?: string;
  follow_completed: boolean;
  missions_data: any;
  submitted_at: string;
  ip_address?: string;
  user_agent?: string;
}

interface Mission {
  id: string;
  type: string;
  count: number;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

interface PlatformAccount {
  id: string;
  platform: string;
  account_url: string;
  account_name?: string;
  enabled: boolean;
}

const Manager = () => {
  const [submissions, setSubmissions] = useState<UserSubmission[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [platformAccounts, setPlatformAccounts] = useState<PlatformAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const { toast } = useToast();

  // Authentication
  const handleAuth = () => {
    if (password === 'turno2025admin') {
      setIsAuthenticated(true);
      toast({
        title: "Access Granted",
        description: "Welcome to the manager dashboard",
      });
    } else {
      toast({
        title: "Access Denied",
        description: "Invalid password",
        variant: "destructive",
      });
    }
  };

  // Load initial data
  useEffect(() => {
    if (!isAuthenticated) return;
    
    loadAllData();
    setupRealTimeSubscriptions();
  }, [isAuthenticated]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      // Load submissions
      const { data: submissionsData } = await supabase
        .from('user_submissions')
        .select('*')
        .order('submitted_at', { ascending: false });
      
      if (submissionsData) setSubmissions(submissionsData);

      // Load missions
      const { data: missionsData } = await supabase
        .from('missions')
        .select('*')
        .order('type', { ascending: true });
      
      if (missionsData) setMissions(missionsData);

      // Load platform accounts
      const { data: platformData } = await supabase
        .from('platform_accounts')
        .select('*')
        .order('platform', { ascending: true });
      
      if (platformData) setPlatformAccounts(platformData);

    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const setupRealTimeSubscriptions = () => {
    // Real-time submissions
    const submissionsChannel = supabase
      .channel('submissions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_submissions'
        },
        () => {
          loadAllData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(submissionsChannel);
    };
  };

  // Mission management
  const updateMission = async (id: string, updates: Partial<Mission>) => {
    try {
      const { error } = await supabase
        .from('missions')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Mission updated successfully",
      });
      loadAllData();
    } catch (error) {
      console.error('Error updating mission:', error);
      toast({
        title: "Error",
        description: "Failed to update mission",
        variant: "destructive",
      });
    }
  };

  const addMission = async () => {
    try {
      const { error } = await supabase
        .from('missions')
        .insert({
          type: 'followers',
          count: 10,
          enabled: true
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Mission added successfully",
      });
      loadAllData();
    } catch (error) {
      console.error('Error adding mission:', error);
      toast({
        title: "Error",
        description: "Failed to add mission",
        variant: "destructive",
      });
    }
  };

  // Platform account management
  const updatePlatformAccount = async (id: string, updates: Partial<PlatformAccount>) => {
    try {
      const { error } = await supabase
        .from('platform_accounts')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Platform account updated successfully",
      });
      loadAllData();
    } catch (error) {
      console.error('Error updating platform account:', error);
      toast({
        title: "Error",
        description: "Failed to update platform account",
        variant: "destructive",
      });
    }
  };

  const addPlatformAccount = async () => {
    try {
      const { error } = await supabase
        .from('platform_accounts')
        .insert({
          platform: 'instagram',
          account_url: 'https://instagram.com/newaccount',
          account_name: 'New Account',
          enabled: true
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Platform account added successfully",
      });
      loadAllData();
    } catch (error) {
      console.error('Error adding platform account:', error);
      toast({
        title: "Error",
        description: "Failed to add platform account",
        variant: "destructive",
      });
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Manager Access
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAuth()}
                placeholder="Enter admin password"
              />
            </div>
            <Button onClick={handleAuth} className="w-full">
              Access Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Turno Manager
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage missions, platform accounts, and view user submissions
            </p>
          </div>
          <Button onClick={loadAllData} disabled={loading} variant="outline">
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <Tabs defaultValue="submissions" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="submissions" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Submissions
            </TabsTrigger>
            <TabsTrigger value="missions" className="flex items-center gap-2">
              <Database className="w-4 h-4" />
              Missions
            </TabsTrigger>
            <TabsTrigger value="platforms" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Platforms
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          {/* User Submissions */}
          <TabsContent value="submissions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>User Submissions ({submissions.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {submissions.map((submission) => (
                    <Card key={submission.id} className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <h4 className="font-semibold">{submission.username}</h4>
                          <Badge variant="outline">{submission.platform}</Badge>
                          <p className="text-sm text-muted-foreground mt-1">
                            {new Date(submission.submitted_at).toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm">
                            <strong>Follow Completed:</strong> {submission.follow_completed ? '✅' : '❌'}
                          </p>
                          {submission.video_link && (
                            <p className="text-sm truncate">
                              <strong>Video:</strong> {submission.video_link}
                            </p>
                          )}
                        </div>
                        <div>
                          <p className="text-sm">
                            <strong>Missions:</strong>
                          </p>
                          <div className="text-xs text-muted-foreground">
                            {JSON.stringify(submission.missions_data)}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Missions Management */}
          <TabsContent value="missions" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Mission Settings</CardTitle>
                <Button onClick={addMission}>Add Mission</Button>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {missions.map((mission) => (
                    <Card key={mission.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div>
                            <h4 className="font-semibold capitalize">{mission.type}</h4>
                            <p className="text-sm text-muted-foreground">Count: {mission.count}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <Switch
                            checked={mission.enabled}
                            onCheckedChange={(checked) => 
                              updateMission(mission.id, { enabled: checked })
                            }
                          />
                          <Input
                            type="number"
                            value={mission.count}
                            onChange={(e) => 
                              updateMission(mission.id, { count: parseInt(e.target.value) })
                            }
                            className="w-20"
                          />
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Platform Accounts */}
          <TabsContent value="platforms" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Platform Accounts</CardTitle>
                <Button onClick={addPlatformAccount}>Add Account</Button>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {platformAccounts.map((account) => (
                    <Card key={account.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold capitalize">{account.platform}</h4>
                          <p className="text-sm text-muted-foreground">{account.account_name}</p>
                          <p className="text-xs text-blue-500">{account.account_url}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <Switch
                            checked={account.enabled}
                            onCheckedChange={(checked) => 
                              updatePlatformAccount(account.id, { enabled: checked })
                            }
                          />
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics */}
          <TabsContent value="analytics" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Total Submissions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-primary">{submissions.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Completed Follows</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-500">
                    {submissions.filter(s => s.follow_completed).length}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Active Missions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-500">
                    {missions.filter(m => m.enabled).length}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Manager;