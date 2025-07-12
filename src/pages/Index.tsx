
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Search, MessageSquare, TrendingUp, Clock, User, Bell, Plus, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { AskQuestionDialog } from "@/components/AskQuestionDialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Pagination } from "@/components/Pagination";

interface Question {
  id: string;
  title: string;
  description: string;
  tags: string[];
  created_at: string;
  accepted_answer_id: string | null;
  user_id: string;
  profiles: {
    username: string;
  } | null;
  answer_count?: number;
}

const ITEMS_PER_PAGE = 5;

const trendingTags = [
  { name: "react", count: 1234 },
  { name: "javascript", count: 2156 },
  { name: "typescript", count: 987 },
  { name: "nodejs", count: 876 },
  { name: "python", count: 1543 },
  { name: "css", count: 654 },
  { name: "mongodb", count: 432 },
  { name: "api", count: 765 }
];

const Index = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [showAskDialog, setShowAskDialog] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const { user, signOut } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchQuestions();
  }, [currentPage, searchQuery]);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('questions')
        .select(`
          *,
          answers (id)
        `, { count: 'exact' })
        .order('created_at', { ascending: false });

      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
      }

      const { data, error, count } = await query
        .range((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE - 1);

      if (error) {
        console.error('Error fetching questions:', error);
        throw error;
      }

      // Fetch profiles for all questions
      const userIds = [...new Set((data || []).map(q => q.user_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, username')
        .in('user_id', userIds);

      const profilesMap = new Map(
        (profilesData || []).map(p => [p.user_id, p.username])
      );

      const questionsWithCounts = (data || []).map(question => ({
        ...question,
        answer_count: question.answers?.length || 0,
        profiles: { username: profilesMap.get(question.user_id) || 'Anonymous' }
      }));

      setQuestions(questionsWithCounts);
      setTotalQuestions(count || 0);
    } catch (error) {
      console.error('Error fetching questions:', error);
      toast({
        title: "Error",
        description: "Failed to load questions.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    toast({
      title: "Logged out",
      description: "You've been successfully logged out.",
    });
  };

  const handleQuestionSubmit = async () => {
    setShowAskDialog(false);
    fetchQuestions();
    toast({
      title: "Question posted!",
      description: "Your question has been successfully submitted.",
    });
  };

  const totalPages = Math.ceil(totalQuestions / ITEMS_PER_PAGE);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 cursor-pointer" onClick={() => navigate('/')}>
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-xl font-bold text-gray-900">StackIt</h1>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {user && (
                <Button
                  variant="outline"
                  size="sm"
                  className="hidden sm:flex items-center space-x-2"
                >
                  <Bell className="w-4 h-4" />
                  <span className="bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[16px] h-4 flex items-center justify-center">
                    3
                  </span>
                </Button>
              )}
              
              {user ? (
                <div className="flex items-center space-x-3">
                  <Button
                    onClick={() => setShowAskDialog(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    size="sm"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Ask Question
                  </Button>
                  <div className="flex items-center space-x-2">
                    <Avatar className="w-8 h-8 cursor-pointer" onClick={() => navigate('/profile')}>
                      <AvatarFallback>{user.email?.charAt(0)?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span className="hidden sm:block text-sm font-medium cursor-pointer" onClick={() => navigate('/profile')}>
                      {user.email?.split('@')[0]}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleLogout}
                      className="text-gray-600 hover:text-gray-900"
                    >
                      <LogOut className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/auth')}
                  >
                    Login
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => navigate('/auth')}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Sign Up
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Search Bar */}
            <div className="relative mb-8">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Search questions, topics, or tags..."
                className="pl-10 h-12 text-lg"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center space-x-6 mb-6 border-b border-gray-200">
              <button className="pb-2 border-b-2 border-blue-600 text-blue-600 font-medium">
                Recent
              </button>
              <button className="pb-2 text-gray-600 hover:text-gray-900">
                Trending
              </button>
              <button className="pb-2 text-gray-600 hover:text-gray-900">
                Unanswered
              </button>
            </div>

            {/* Questions List */}
            {loading ? (
              <div className="text-center py-8">Loading questions...</div>
            ) : (
              <div className="space-y-4">
                {questions.length === 0 ? (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <p className="text-gray-600">No questions found.</p>
                      {user && (
                        <Button 
                          onClick={() => setShowAskDialog(true)}
                          className="mt-4"
                        >
                          Ask the First Question
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  questions.map((question) => (
                    <Card key={question.id} className="hover:shadow-md transition-shadow cursor-pointer">
                      <CardContent className="p-6" onClick={() => navigate(`/question/${question.id}`)}>
                        <div className="flex items-start space-x-4">
                          <div className="flex flex-col items-center space-y-2 text-center min-w-[60px]">
                            <div className="text-lg font-semibold text-gray-900">0</div>
                            <div className="text-xs text-gray-500">votes</div>
                            <div className={`text-lg font-semibold ${question.accepted_answer_id ? 'text-green-600' : 'text-gray-900'}`}>
                              {question.answer_count || 0}
                            </div>
                            <div className="text-xs text-gray-500">answers</div>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-2">
                              {question.accepted_answer_id && (
                                <Badge variant="secondary" className="bg-green-100 text-green-800">
                                  Answered
                                </Badge>
                              )}
                            </div>
                            
                            <h3 className="text-lg font-semibold text-gray-900 mb-2 hover:text-blue-600">
                              {question.title}
                            </h3>
                            
                            <p className="text-gray-600 mb-3 line-clamp-2">
                              {question.description.substring(0, 150)}...
                            </p>

                            <div className="flex flex-wrap gap-2 mb-3">
                              {question.tags?.map((tag) => (
                                <Badge key={tag} variant="secondary" className="bg-blue-100 text-blue-800">
                                  {tag}
                                </Badge>
                              ))}
                            </div>

                            <div className="flex items-center justify-between text-sm text-gray-500">
                              <div className="flex items-center space-x-2">
                                <User className="w-4 h-4" />
                                <span>{question.profiles?.username || 'Anonymous'}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Clock className="w-4 h-4" />
                                <span>{new Date(question.created_at).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}

                {totalPages > 1 && (
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                  />
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="space-y-6">
              {/* Trending Tags */}
              <Card>
                <CardHeader>
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="w-5 h-5 text-orange-500" />
                    <h3 className="font-semibold">Trending Tags</h3>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {trendingTags.map((tag) => (
                      <div key={tag.name} className="flex items-center justify-between">
                        <Badge variant="outline" className="cursor-pointer hover:bg-gray-100">
                          {tag.name}
                        </Badge>
                        <span className="text-xs text-gray-500">{tag.count}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Stats */}
              <Card>
                <CardHeader>
                  <h3 className="font-semibold">Community Stats</h3>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Questions</span>
                      <span className="font-semibold">{totalQuestions}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Answers</span>
                      <span className="font-semibold">
                        {questions.reduce((sum, q) => sum + (q.answer_count || 0), 0)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Users</span>
                      <span className="font-semibold">0</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tags</span>
                      <span className="font-semibold">8</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      <AskQuestionDialog
        open={showAskDialog}
        onOpenChange={setShowAskDialog}
        onSubmit={handleQuestionSubmit}
      />
    </div>
  );
};

export default Index;
