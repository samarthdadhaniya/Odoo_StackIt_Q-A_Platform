
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { Breadcrumb } from '@/components/Breadcrumb';
import { User, Clock, MessageSquare, HelpCircle } from 'lucide-react';

interface UserQuestion {
  id: string;
  title: string;
  description: string;
  tags: string[];
  created_at: string;
  accepted_answer_id: string | null;
}

interface UserAnswer {
  id: string;
  content: string;
  created_at: string;
  questions: {
    id: string;
    title: string;
  };
}

const Profile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [userQuestions, setUserQuestions] = useState<UserQuestion[]>([]);
  const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    
    fetchUserActivity();
  }, [user, navigate]);

  const fetchUserActivity = async () => {
    if (!user) return;

    try {
      // Fetch user's questions
      const { data: questions, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (questionsError) throw questionsError;
      setUserQuestions(questions || []);

      // Fetch user's answers
      const { data: answers, error: answersError } = await supabase
        .from('answers')
        .select(`
          *,
          questions:question_id (id, title)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (answersError) throw answersError;
      setUserAnswers(answers || []);
    } catch (error) {
      console.error('Error fetching user activity:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Breadcrumb 
        items={[
          { label: "Profile" }
        ]} 
      />

      <div className="mb-8">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
            <User className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{user.email}</h1>
            <p className="text-gray-600">Member since {new Date(user.created_at).toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="questions" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="questions" className="flex items-center space-x-2">
            <HelpCircle className="w-4 h-4" />
            <span>My Questions ({userQuestions.length})</span>
          </TabsTrigger>
          <TabsTrigger value="answers" className="flex items-center space-x-2">
            <MessageSquare className="w-4 h-4" />
            <span>My Answers ({userAnswers.length})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="questions">
          <div className="space-y-4">
            {userQuestions.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-gray-600">You haven't asked any questions yet.</p>
                </CardContent>
              </Card>
            ) : (
              userQuestions.map((question) => (
                <Card key={question.id} className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-6" onClick={() => navigate(`/question/${question.id}`)}>
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-lg font-semibold hover:text-blue-600">
                        {question.title}
                      </h3>
                      {question.accepted_answer_id && (
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          Solved
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-gray-600 mb-3 line-clamp-2">
                      {question.description}
                    </p>

                    <div className="flex flex-wrap gap-2 mb-3">
                      {question.tags.map((tag) => (
                        <Badge key={tag} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>

                    <div className="flex items-center text-sm text-gray-500">
                      <Clock className="w-4 h-4 mr-1" />
                      <span>{new Date(question.created_at).toLocaleDateString()}</span>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="answers">
          <div className="space-y-4">
            {userAnswers.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-gray-600">You haven't answered any questions yet.</p>
                </CardContent>
              </Card>
            ) : (
              userAnswers.map((answer) => (
                <Card key={answer.id} className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-6" onClick={() => navigate(`/question/${answer.questions.id}`)}>
                    <h3 className="text-lg font-semibold hover:text-blue-600 mb-2">
                      {answer.questions.title}
                    </h3>
                    
                    <p className="text-gray-600 mb-3 line-clamp-3">
                      {answer.content}
                    </p>

                    <div className="flex items-center text-sm text-gray-500">
                      <Clock className="w-4 h-4 mr-1" />
                      <span>Answered on {new Date(answer.created_at).toLocaleDateString()}</span>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Profile;
