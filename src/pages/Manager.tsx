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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { 
  RefreshCw, Users, Settings, Database, Eye, EyeOff, 
  BarChart3, Shield, Ban, Download, Upload, Activity,
  AlertTriangle, Clock, TrendingUp, Filter, Search,
  UserX, Mail, Calendar, Globe, Smartphone, Monitor,
  Trash2, Edit, Plus, Save, X, CheckCircle, XCircle,
  PieChart, LineChart, Target, Zap, Bell, Play, Pause
} from 'lucide-react';

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

interface SystemSettings {
  maintenance_mode: boolean;
  rate_limit_enabled: boolean;
  max_submissions_per_hour: number;
  auto_approve_follows: boolean;
  require_video_links: boolean;
  blocked_ips: string[];
  blocked_usernames: string[];
}

interface AnalyticsData {
  totalSubmissions: number;
  todaySubmissions: number;
  completedFollows: number;
  followConversionRate: number;
  platformBreakdown: Record<string, number>;
  hourlyActivity: Array<{ hour: number; count: number }>;
  topMissions: Array<{ type: string; count: number }>;
}

const Manager = () => {
  const [submissions, setSubmissions] = useState<UserSubmission[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [platformAccounts, setPlatformAccounts] = useState<PlatformAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    maintenance_mode: false,
    rate_limit_enabled: true,
    max_submissions_per_hour: 10,
    auto_approve_follows: false,
    require_video_links: false,
    blocked_ips: [],
    blocked_usernames: []
  });
  const [searchFilter, setSearchFilter] = useState('');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [selectedSubmissions, setSelectedSubmissions] = useState<string[]>([]);
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [newMission, setNewMission] = useState({ type: 'followers', count: 10 });
  const [newPlatformAccount, setNewPlatformAccount] = useState({ 
    platform: 'instagram', 
    account_url: '', 
    account_name: '' 
  });
  const { toast } = useToast();

  // Authentication
  const handleAuth = () => {
    if (password === 'turno2025admin') {
      setIsAuthenticated(true);
      loadSystemSettings();
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
    calculateAnalytics();
    setupRealTimeSubscriptions();
    
    // Auto-refresh every 30 seconds if live mode is on
    const interval = isLiveMode ? setInterval(() => {
      loadAllData();
      calculateAnalytics();
    }, 30000) : null;
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isAuthenticated, isLiveMode]);

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
          calculateAnalytics();
          if (isLiveMode) {
            toast({
              title: "Live Update",
              description: "New submission received",
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(submissionsChannel);
    };
  };

  // System Settings Management
  const loadSystemSettings = async () => {
    try {
      const { data } = await supabase
        .from('mission_settings')
        .select('*')
        .eq('setting_key', 'system_config')
        .single();
      
      if (data && data.setting_value) {
        setSystemSettings({ 
          ...systemSettings, 
          ...(data.setting_value as Record<string, any>)
        });
      }
    } catch (error) {
      console.error('Error loading system settings:', error);
    }
  };

  const saveSystemSettings = async () => {
    try {
      const { error } = await supabase
        .from('mission_settings')
        .upsert({
          setting_key: 'system_config',
          setting_value: systemSettings as any,
          description: 'System-wide configuration settings'
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "System settings saved successfully",
      });
    } catch (error) {
      console.error('Error saving system settings:', error);
      toast({
        title: "Error",
        description: "Failed to save system settings",
        variant: "destructive",
      });
    }
  };

  // Analytics Calculation
  const calculateAnalytics = () => {
    if (!submissions.length) return;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const todaySubmissions = submissions.filter(s => 
      new Date(s.submitted_at) >= today
    ).length;

    const completedFollows = submissions.filter(s => s.follow_completed).length;
    const followConversionRate = submissions.length > 0 
      ? Math.round((completedFollows / submissions.length) * 100) 
      : 0;

    const platformBreakdown = submissions.reduce((acc, s) => {
      acc[s.platform] = (acc[s.platform] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Generate hourly activity for last 24 hours
    const hourlyActivity = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      count: submissions.filter(s => {
        const submissionHour = new Date(s.submitted_at).getHours();
        return submissionHour === hour;
      }).length
    }));

    // Top missions from submissions
    const missionCounts = submissions.reduce((acc, s) => {
      if (s.missions_data) {
        Object.keys(s.missions_data).forEach(type => {
          if (s.missions_data[type]?.selected) {
            acc[type] = (acc[type] || 0) + 1;
          }
        });
      }
      return acc;
    }, {} as Record<string, number>);

    const topMissions = Object.entries(missionCounts)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    setAnalytics({
      totalSubmissions: submissions.length,
      todaySubmissions,
      completedFollows,
      followConversionRate,
      platformBreakdown,
      hourlyActivity,
      topMissions
    });
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
          type: newMission.type,
          count: newMission.count,
          enabled: true
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Mission added successfully",
      });
      setNewMission({ type: 'followers', count: 10 });
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

  const deleteMission = async (id: string) => {
    try {
      const { error } = await supabase
        .from('missions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Mission deleted successfully",
      });
      loadAllData();
    } catch (error) {
      console.error('Error deleting mission:', error);
      toast({
        title: "Error",
        description: "Failed to delete mission",
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
    if (!newPlatformAccount.account_url || !newPlatformAccount.account_name) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('platform_accounts')
        .insert({
          platform: newPlatformAccount.platform,
          account_url: newPlatformAccount.account_url,
          account_name: newPlatformAccount.account_name,
          enabled: true
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Platform account added successfully",
      });
      setNewPlatformAccount({ platform: 'instagram', account_url: '', account_name: '' });
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

  const deletePlatformAccount = async (id: string) => {
    try {
      const { error } = await supabase
        .from('platform_accounts')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Platform account deleted successfully",
      });
      loadAllData();
    } catch (error) {
      console.error('Error deleting platform account:', error);
      toast({
        title: "Error",
        description: "Failed to delete platform account",
        variant: "destructive",
      });
    }
  };

  // User Management Functions
  const blockUser = async (id: string, reason: string) => {
    try {
      const { error } = await supabase
        .from('user_submissions')
        .update({ 
          user_agent: `BLOCKED: ${reason}`,
          ip_address: 'BLOCKED'
        })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "User blocked successfully",
      });
      loadAllData();
    } catch (error) {
      console.error('Error blocking user:', error);
      toast({
        title: "Error",
        description: "Failed to block user",
        variant: "destructive",
      });
    }
  };

  const exportData = () => {
    const dataToExport = {
      submissions,
      missions,
      platformAccounts,
      analytics,
      exportedAt: new Date().toISOString()
    };
    
    const dataStr = JSON.stringify(dataToExport, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `turno-data-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    toast({
      title: "Success",
      description: "Data exported successfully",
    });
  };

  // Filtering functions
  const getFilteredSubmissions = () => {
    return submissions.filter(submission => {
      const matchesSearch = searchFilter === '' || 
        submission.username.toLowerCase().includes(searchFilter.toLowerCase()) ||
        submission.platform.toLowerCase().includes(searchFilter.toLowerCase()) ||
        (submission.video_link && submission.video_link.toLowerCase().includes(searchFilter.toLowerCase()));
      
      const matchesPlatform = platformFilter === 'all' || submission.platform === platformFilter;
      
      const matchesDate = dateFilter === 'all' || (() => {
        const submissionDate = new Date(submission.submitted_at);
        const now = new Date();
        
        switch (dateFilter) {
          case 'today':
            return submissionDate.toDateString() === now.toDateString();
          case 'week':
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            return submissionDate >= weekAgo;
          case 'month':
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            return submissionDate >= monthAgo;
          default:
            return true;
        }
      })();
      
      return matchesSearch && matchesPlatform && matchesDate;
    });
  };

  const bulkAction = async (action: string) => {
    if (selectedSubmissions.length === 0) {
      toast({
        title: "Error",
        description: "No submissions selected",
        variant: "destructive",
      });
      return;
    }

    try {
      if (action === 'delete') {
        const { error } = await supabase
          .from('user_submissions')
          .delete()
          .in('id', selectedSubmissions);

        if (error) throw error;
        
        toast({
          title: "Success",
          description: `${selectedSubmissions.length} submissions deleted`,
        });
      } else if (action === 'block') {
        const { error } = await supabase
          .from('user_submissions')
          .update({ user_agent: 'BLOCKED: Bulk action' })
          .in('id', selectedSubmissions);

        if (error) throw error;
        
        toast({
          title: "Success",
          description: `${selectedSubmissions.length} users blocked`,
        });
      }

      setSelectedSubmissions([]);
      loadAllData();
    } catch (error) {
      console.error('Error performing bulk action:', error);
      toast({
        title: "Error",
        description: "Failed to perform bulk action",
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

        {/* Live Mode Toggle */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Switch
              checked={isLiveMode}
              onCheckedChange={setIsLiveMode}
            />
            <Label className="flex items-center gap-2">
              {isLiveMode ? <Activity className="w-4 h-4 text-green-500 animate-pulse" /> : <Pause className="w-4 h-4" />}
              Live Mode
            </Label>
          </div>
          {systemSettings.maintenance_mode && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Maintenance Mode
            </Badge>
          )}
        </div>

        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="submissions" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Submissions
            </TabsTrigger>
            <TabsTrigger value="missions" className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              Missions
            </TabsTrigger>
            <TabsTrigger value="platforms" className="flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Platforms
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              User Mgmt
            </TabsTrigger>
            <TabsTrigger value="system" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              System
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <PieChart className="w-4 h-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Overview */}
          <TabsContent value="dashboard" className="space-y-4">
            {analytics && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Total Submissions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-primary">{analytics.totalSubmissions}</div>
                    <p className="text-xs text-muted-foreground">
                      +{analytics.todaySubmissions} today
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Follow Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-500">{analytics.followConversionRate}%</div>
                    <Progress value={analytics.followConversionRate} className="mt-2" />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Active Missions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-500">{missions.filter(m => m.enabled).length}</div>
                    <p className="text-xs text-muted-foreground">
                      of {missions.length} total
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Platforms</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-purple-500">{platformAccounts.filter(p => p.enabled).length}</div>
                    <p className="text-xs text-muted-foreground">
                      platforms active
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Platform Breakdown */}
            {analytics && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Platform Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(analytics.platformBreakdown).map(([platform, count]) => (
                        <div key={platform} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="capitalize">{platform}</Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <Progress 
                              value={(count / analytics.totalSubmissions) * 100} 
                              className="w-20 h-2" 
                            />
                            <span className="text-sm font-medium">{count}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Top Mission Types</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {analytics.topMissions.map((mission, index) => (
                        <div key={mission.type} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold">
                              {index + 1}
                            </span>
                            <span className="capitalize font-medium">{mission.type}</span>
                          </div>
                          <Badge variant="secondary">{mission.count}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* Enhanced User Submissions */}
          <TabsContent value="submissions" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>User Submissions ({getFilteredSubmissions().length})</CardTitle>
                  <div className="flex items-center gap-2">
                    <Button onClick={exportData} variant="outline" size="sm">
                      <Download className="w-4 h-4 mr-2" />
                      Export
                    </Button>
                    {selectedSubmissions.length > 0 && (
                      <div className="flex gap-2">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm">
                              <Ban className="w-4 h-4 mr-2" />
                              Block Selected ({selectedSubmissions.length})
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Block Users</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will block {selectedSubmissions.length} selected users. Are you sure?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => bulkAction('block')}>
                                Block Users
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm">
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete Selected
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Submissions</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete {selectedSubmissions.length} submissions. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => bulkAction('delete')}>
                                Delete Submissions
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-4 mt-4">
                  <div className="flex items-center gap-2">
                    <Search className="w-4 h-4" />
                    <Input
                      placeholder="Search submissions..."
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      className="w-64"
                    />
                  </div>
                  <Select value={platformFilter} onValueChange={setPlatformFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Platform" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Platforms</SelectItem>
                      <SelectItem value="instagram">Instagram</SelectItem>
                      <SelectItem value="tiktok">TikTok</SelectItem>
                      <SelectItem value="youtube">YouTube</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={dateFilter} onValueChange={setDateFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Date Range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="week">This Week</SelectItem>
                      <SelectItem value="month">This Month</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {getFilteredSubmissions().map((submission) => (
                    <Card key={submission.id} className="p-4">
                      <div className="flex items-start gap-4">
                        <input
                          type="checkbox"
                          checked={selectedSubmissions.includes(submission.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedSubmissions([...selectedSubmissions, submission.id]);
                            } else {
                              setSelectedSubmissions(selectedSubmissions.filter(id => id !== submission.id));
                            }
                          }}
                          className="mt-1"
                        />
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div>
                            <h4 className="font-semibold flex items-center gap-2">
                              {submission.username}
                              {submission.user_agent?.includes('BLOCKED') && (
                                <Badge variant="destructive" className="text-xs">
                                  <Ban className="w-3 h-3 mr-1" />
                                  Blocked
                                </Badge>
                              )}
                            </h4>
                            <Badge variant="outline" className="capitalize">{submission.platform}</Badge>
                            <p className="text-sm text-muted-foreground mt-1">
                              <Calendar className="w-3 h-3 inline mr-1" />
                              {new Date(submission.submitted_at).toLocaleString()}
                            </p>
                            {submission.ip_address && submission.ip_address !== 'BLOCKED' && (
                              <p className="text-xs text-muted-foreground">
                                <Globe className="w-3 h-3 inline mr-1" />
                                {submission.ip_address}
                              </p>
                            )}
                          </div>
                          <div>
                            <p className="text-sm flex items-center gap-2">
                              <strong>Follow Status:</strong> 
                              {submission.follow_completed ? (
                                <CheckCircle className="w-4 h-4 text-green-500" />
                              ) : (
                                <XCircle className="w-4 h-4 text-red-500" />
                              )}
                            </p>
                            {submission.video_link && (
                              <div>
                                <p className="text-sm font-medium">Video Link:</p>
                                <a 
                                  href={submission.video_link} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-500 hover:underline truncate block"
                                >
                                  {submission.video_link}
                                </a>
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium mb-2">Mission Data:</p>
                            <div className="space-y-1">
                              {submission.missions_data && Object.entries(submission.missions_data).map(([type, data]: [string, any]) => (
                                data?.selected && (
                                  <Badge key={type} variant="secondary" className="text-xs mr-1">
                                    {type}: {data.count}
                                  </Badge>
                                )
                              ))}
                            </div>
                          </div>
                          <div className="flex flex-col gap-2">
                            {!submission.user_agent?.includes('BLOCKED') && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="destructive" size="sm">
                                    <Ban className="w-3 h-3 mr-1" />
                                    Block User
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Block User</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will block the user "{submission.username}". Are you sure?
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => blockUser(submission.id, 'Admin action')}>
                                      Block User
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                            {submission.user_agent && (
                              <div className="text-xs text-muted-foreground">
                                <Smartphone className="w-3 h-3 inline mr-1" />
                                {submission.user_agent.length > 30 
                                  ? submission.user_agent.substring(0, 30) + '...' 
                                  : submission.user_agent}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Enhanced Missions Management */}
          <TabsContent value="missions" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Mission Settings ({missions.length})</CardTitle>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Mission
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Mission</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="mission-type">Mission Type</Label>
                        <Select value={newMission.type} onValueChange={(value) => setNewMission({...newMission, type: value})}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="followers">Followers</SelectItem>
                            <SelectItem value="likes">Likes</SelectItem>
                            <SelectItem value="comments">Comments</SelectItem>
                            <SelectItem value="views">Views</SelectItem>
                            <SelectItem value="shares">Shares</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="mission-count">Count</Label>
                        <Input
                          id="mission-count"
                          type="number"
                          value={newMission.count}
                          onChange={(e) => setNewMission({...newMission, count: parseInt(e.target.value)})}
                          min="1"
                        />
                      </div>
                      <Button onClick={addMission} className="w-full">
                        <Save className="w-4 h-4 mr-2" />
                        Add Mission
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {missions.map((mission) => (
                    <Card key={mission.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                            <Target className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h4 className="font-semibold capitalize flex items-center gap-2">
                              {mission.type}
                              {mission.enabled ? (
                                <Badge variant="default" className="text-xs">Active</Badge>
                              ) : (
                                <Badge variant="secondary" className="text-xs">Disabled</Badge>
                              )}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              Target: {mission.count} {mission.type}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Created: {new Date(mission.created_at).toLocaleDateString()}
                            </p>
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
                            className="w-24"
                            min="1"
                          />
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="sm">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Mission</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete the "{mission.type}" mission. Are you sure?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteMission(mission.id)}>
                                  Delete Mission
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Enhanced Platform Accounts */}
          <TabsContent value="platforms" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Platform Accounts ({platformAccounts.length})</CardTitle>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Account
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Platform Account</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="platform">Platform</Label>
                        <Select value={newPlatformAccount.platform} onValueChange={(value) => setNewPlatformAccount({...newPlatformAccount, platform: value})}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="instagram">Instagram</SelectItem>
                            <SelectItem value="tiktok">TikTok</SelectItem>
                            <SelectItem value="youtube">YouTube</SelectItem>
                            <SelectItem value="twitter">Twitter</SelectItem>
                            <SelectItem value="facebook">Facebook</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="account-name">Account Name</Label>
                        <Input
                          id="account-name"
                          value={newPlatformAccount.account_name}
                          onChange={(e) => setNewPlatformAccount({...newPlatformAccount, account_name: e.target.value})}
                          placeholder="@username or display name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="account-url">Account URL</Label>
                        <Input
                          id="account-url"
                          value={newPlatformAccount.account_url}
                          onChange={(e) => setNewPlatformAccount({...newPlatformAccount, account_url: e.target.value})}
                          placeholder="https://..."
                        />
                      </div>
                      <Button onClick={addPlatformAccount} className="w-full">
                        <Save className="w-4 h-4 mr-2" />
                        Add Account
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {platformAccounts.map((account) => (
                    <Card key={account.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                            <Globe className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h4 className="font-semibold capitalize flex items-center gap-2">
                              {account.platform}
                              {account.enabled ? (
                                <Badge variant="default" className="text-xs">Active</Badge>
                              ) : (
                                <Badge variant="secondary" className="text-xs">Disabled</Badge>
                              )}
                            </h4>
                            <p className="text-sm text-muted-foreground">{account.account_name}</p>
                            <a 
                              href={account.account_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs text-blue-500 hover:underline"
                            >
                              {account.account_url}
                            </a>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <Switch
                            checked={account.enabled}
                            onCheckedChange={(checked) => 
                              updatePlatformAccount(account.id, { enabled: checked })
                            }
                          />
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => window.open(account.account_url, '_blank')}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="sm">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Platform Account</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete the "{account.account_name}" account. Are you sure?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deletePlatformAccount(account.id)}>
                                  Delete Account
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* User Management */}
          <TabsContent value="users" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Blocked Users</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-500">
                    {submissions.filter(s => s.user_agent?.includes('BLOCKED')).length}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-500">
                    {submissions.filter(s => !s.user_agent?.includes('BLOCKED')).length}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Unique IPs</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-500">
                    {new Set(submissions.filter(s => s.ip_address && s.ip_address !== 'BLOCKED').map(s => s.ip_address)).size}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>User Activity Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    Recent user activity and blocking actions will appear here
                  </div>
                  {submissions.filter(s => s.user_agent?.includes('BLOCKED')).slice(0, 10).map((blocked) => (
                    <div key={blocked.id} className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                      <div>
                        <span className="font-medium">{blocked.username}</span>
                        <span className="text-sm text-muted-foreground ml-2">({blocked.platform})</span>
                      </div>
                      <Badge variant="destructive">
                        <Ban className="w-3 h-3 mr-1" />
                        Blocked
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* System Settings */}
          <TabsContent value="system" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>System Controls</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">Maintenance Mode</Label>
                      <p className="text-sm text-muted-foreground">Block new submissions</p>
                    </div>
                    <Switch
                      checked={systemSettings.maintenance_mode}
                      onCheckedChange={(checked) => 
                        setSystemSettings({...systemSettings, maintenance_mode: checked})
                      }
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">Rate Limiting</Label>
                      <p className="text-sm text-muted-foreground">Limit submissions per hour</p>
                    </div>
                    <Switch
                      checked={systemSettings.rate_limit_enabled}
                      onCheckedChange={(checked) => 
                        setSystemSettings({...systemSettings, rate_limit_enabled: checked})
                      }
                    />
                  </div>

                  <div>
                    <Label>Max Submissions Per Hour</Label>
                    <Input
                      type="number"
                      value={systemSettings.max_submissions_per_hour}
                      onChange={(e) => 
                        setSystemSettings({...systemSettings, max_submissions_per_hour: parseInt(e.target.value)})
                      }
                      className="mt-1"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">Auto-approve Follows</Label>
                      <p className="text-sm text-muted-foreground">Automatically mark follows as completed</p>
                    </div>
                    <Switch
                      checked={systemSettings.auto_approve_follows}
                      onCheckedChange={(checked) => 
                        setSystemSettings({...systemSettings, auto_approve_follows: checked})
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">Require Video Links</Label>
                      <p className="text-sm text-muted-foreground">Make video links mandatory</p>
                    </div>
                    <Switch
                      checked={systemSettings.require_video_links}
                      onCheckedChange={(checked) => 
                        setSystemSettings({...systemSettings, require_video_links: checked})
                      }
                    />
                  </div>

                  <Button onClick={saveSystemSettings} className="w-full">
                    <Save className="w-4 h-4 mr-2" />
                    Save Settings
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>System Health</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Database Connection</span>
                    <Badge variant="default" className="bg-green-500">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Online
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Live Updates</span>
                    <Badge variant={isLiveMode ? "default" : "secondary"}>
                      {isLiveMode ? (
                        <>
                          <Activity className="w-3 h-3 mr-1 animate-pulse" />
                          Active
                        </>
                      ) : (
                        <>
                          <Pause className="w-3 h-3 mr-1" />
                          Paused
                        </>
                      )}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm">System Status</span>
                    <Badge variant={systemSettings.maintenance_mode ? "destructive" : "default"}>
                      {systemSettings.maintenance_mode ? (
                        <>
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Maintenance
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Operational
                        </>
                      )}
                    </Badge>
                  </div>

                  <div className="pt-4">
                    <h4 className="font-medium mb-2">Quick Actions</h4>
                    <div className="space-y-2">
                      <Button variant="outline" size="sm" className="w-full justify-start">
                        <Database className="w-4 h-4 mr-2" />
                        Backup Database
                      </Button>
                      <Button variant="outline" size="sm" className="w-full justify-start">
                        <Bell className="w-4 h-4 mr-2" />
                        Send Notification
                      </Button>
                      <Button variant="outline" size="sm" className="w-full justify-start" onClick={exportData}>
                        <Download className="w-4 h-4 mr-2" />
                        Export All Data
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Enhanced Analytics */}
          <TabsContent value="analytics" className="space-y-4">
            {analytics && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-500">{analytics.followConversionRate}%</div>
                      <Progress value={analytics.followConversionRate} className="mt-2" />
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">Today's Growth</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-blue-500">+{analytics.todaySubmissions}</div>
                      <p className="text-xs text-muted-foreground">submissions today</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">Most Popular</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-lg font-bold text-purple-500">
                        {Object.entries(analytics.platformBreakdown).sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A'}
                      </div>
                      <p className="text-xs text-muted-foreground">platform</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">Peak Hour</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-lg font-bold text-orange-500">
                        {analytics.hourlyActivity.sort((a, b) => b.count - a.count)[0]?.hour || 0}:00
                      </div>
                      <p className="text-xs text-muted-foreground">most active</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Hourly Activity (Last 24h)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {analytics.hourlyActivity.filter(h => h.count > 0).map((hour) => (
                          <div key={hour.hour} className="flex items-center justify-between">
                            <span className="text-sm">{String(hour.hour).padStart(2, '0')}:00</span>
                            <div className="flex items-center gap-2 flex-1 mx-4">
                              <Progress 
                                value={(hour.count / Math.max(...analytics.hourlyActivity.map(h => h.count))) * 100} 
                                className="flex-1 h-2" 
                              />
                            </div>
                            <span className="text-sm font-medium">{hour.count}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Mission Performance</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {analytics.topMissions.map((mission, index) => (
                          <div key={mission.type} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-primary to-accent flex items-center justify-center text-xs font-bold text-white">
                                {index + 1}
                              </div>
                              <span className="capitalize font-medium">{mission.type}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Progress 
                                value={(mission.count / analytics.topMissions[0]?.count || 1) * 100} 
                                className="w-16 h-2" 
                              />
                              <Badge variant="secondary">{mission.count}</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Platform Performance Analysis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {Object.entries(analytics.platformBreakdown).map(([platform, count]) => {
                        const platformSubmissions = submissions.filter(s => s.platform === platform);
                        const followRate = platformSubmissions.length > 0 
                          ? Math.round((platformSubmissions.filter(s => s.follow_completed).length / platformSubmissions.length) * 100)
                          : 0;
                        
                        return (
                          <Card key={platform} className="p-4">
                            <div className="text-center">
                              <h4 className="font-semibold capitalize text-lg">{platform}</h4>
                              <div className="text-2xl font-bold text-primary mb-2">{count}</div>
                              <div className="text-sm text-muted-foreground mb-3">submissions</div>
                              <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                  <span>Follow Rate:</span>
                                  <span className="font-medium">{followRate}%</span>
                                </div>
                                <Progress value={followRate} className="h-2" />
                              </div>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Manager;