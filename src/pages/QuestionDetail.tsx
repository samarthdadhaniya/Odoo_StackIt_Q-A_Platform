
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { RichTextEditor } from '@/components/RichTextEditor';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { VoteButtons } from '@/components/VoteButtons';
import { Breadcrumb } from '@/components/Breadcrumb';
import { Eye, EyeOff, Check, User, Clock, Edit, Trash2 } from 'lucide-react';

interface Question {
  id: string;
  title: string;
  description: string;
  tags: string[];
  created_at: string;
  user_id: string;
  accepted_answer_id: string | null;
  profiles: {
    username: string;
  } | null;
}

interface Answer {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  question_id: string;
  profiles: {
    username: string;
  } | null;
}

const QuestionDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [question, setQuestion] = useState<Question | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [newAnswer, setNewAnswer] = useState('');
  const [revealedAnswers, setRevealedAnswers] = useState<Set<string>>(new Set());
  const [answerVotes, setAnswerVotes] = useState<Record<string, { count: number; userVote: number }>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (id) {
      fetchQuestion();
      fetchAnswers();
    }
  }, [id]);

  const fetchQuestion = async () => {
    try {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      // Fetch profile for the question
      const { data: profileData } = await supabase
        .from('profiles')
        .select('username')
        .eq('user_id', data.user_id)
        .single();

      setQuestion({
        ...data,
        profiles: { username: profileData?.username || 'Anonymous' }
      });
    } catch (error) {
      console.error('Error fetching question:', error);
      toast({
        title: "Error",
        description: "Failed to load question.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAnswers = async () => {
    try {
      const { data, error } = await supabase
        .from('answers')
        .select('*')
        .eq('question_id', id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      // Fetch profiles for all answers
      const userIds = [...new Set((data || []).map(a => a.user_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, username')
        .in('user_id', userIds);

      const profilesMap = new Map(
        (profilesData || []).map(p => [p.user_id, p.username])
      );
      
      const answersWithProfiles = (data || []).map(answer => ({
        ...answer,
        profiles: { username: profilesMap.get(answer.user_id) || 'Anonymous' }
      }));
      
      setAnswers(answersWithProfiles);

      // Fetch vote counts for each answer
      const voteData: Record<string, { count: number; userVote: number }> = {};
      
      for (const answer of answersWithProfiles) {
        const { data: voteCount } = await supabase
          .rpc('get_answer_vote_count', { answer_id: answer.id });
        
        const { data: userVote } = user ? await supabase
          .rpc('get_user_vote', { answer_id: answer.id, user_id: user.id }) : { data: 0 };

        voteData[answer.id] = {
          count: voteCount || 0,
          userVote: userVote || 0
        };
      }
      
      setAnswerVotes(voteData);
    } catch (error) {
      console.error('Error fetching answers:', error);
    }
  };

  const handleSubmitAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      navigate('/auth');
      return;
    }

    if (!newAnswer.trim()) {
      toast({
        title: "Error",
        description: "Please enter your answer.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    
    try {
      const { error } = await supabase
        .from('answers')
        .insert({
          question_id: id,
          user_id: user.id,
          content: newAnswer,
        });

      if (error) throw error;

      setNewAnswer('');
      fetchAnswers();
      toast({
        title: "Success",
        description: "Your answer has been posted!",
      });
    } catch (error) {
      console.error('Error submitting answer:', error);
      toast({
        title: "Error",
        description: "Failed to submit answer. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcceptAnswer = async (answerId: string) => {
    if (!user || !question || question.user_id !== user.id) return;

    try {
      const { error } = await supabase
        .from('questions')
        .update({ accepted_answer_id: answerId })
        .eq('id', id);

      if (error) throw error;

      setQuestion({ ...question, accepted_answer_id: answerId });
      toast({
        title: "Success",
        description: "Answer marked as accepted!",
      });
    } catch (error) {
      console.error('Error accepting answer:', error);
      toast({
        title: "Error",
        description: "Failed to accept answer.",
        variant: "destructive",
      });
    }
  };

  const toggleRevealAnswer = (answerId: string) => {
    const newRevealed = new Set(revealedAnswers);
    if (newRevealed.has(answerId)) {
      newRevealed.delete(answerId);
    } else {
      newRevealed.add(answerId);
    }
    setRevealedAnswers(newRevealed);
  };

  const handleDeleteQuestion = async () => {
    if (!user || !question || question.user_id !== user.id) return;
    
    if (!confirm('Are you sure you want to delete this question?')) return;

    try {
      const { error } = await supabase
        .from('questions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Question deleted successfully.",
      });
      navigate('/');
    } catch (error) {
      console.error('Error deleting question:', error);
      toast({
        title: "Error",
        description: "Failed to delete question.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  if (!question) {
    return <div className="text-center mt-8">Question not found.</div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Breadcrumb 
        items={[
          { label: "Questions", href: "/" },
          { label: question.title }
        ]} 
      />

      {/* Question */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-2xl font-bold mb-4">{question.title}</h1>
              <div className="flex flex-wrap gap-2 mb-4">
                {question.tags?.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
            {user && question.user_id === user.id && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleDeleteQuestion}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <MarkdownRenderer content={question.description} className="mb-4" />
          <div className="flex items-center text-sm text-gray-500">
            <User className="w-4 h-4 mr-1" />
            <span className="mr-4">{question.profiles?.username || 'Anonymous'}</span>
            <Clock className="w-4 h-4 mr-1" />
            <span>{new Date(question.created_at).toLocaleDateString()}</span>
          </div>
        </CardContent>
      </Card>

      {/* Answers */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">
          Answers ({answers.length})
        </h2>
        
        <div className="space-y-4">
          {answers.map((answer) => (
            <Card key={answer.id} className={`${
              question.accepted_answer_id === answer.id ? 'border-green-500 bg-green-50' : ''
            }`}>
              <CardContent className="p-6">
                <div className="flex gap-4">
                  <VoteButtons
                    answerId={answer.id}
                    initialVoteCount={answerVotes[answer.id]?.count || 0}
                    initialUserVote={answerVotes[answer.id]?.userVote || 0}
                    onVoteChange={(newCount) => {
                      setAnswerVotes(prev => ({
                        ...prev,
                        [answer.id]: { ...prev[answer.id], count: newCount }
                      }));
                    }}
                  />
                  
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        {question.accepted_answer_id === answer.id && (
                          <Badge variant="secondary" className="bg-green-100 text-green-800">
                            <Check className="w-3 h-3 mr-1" />
                            Accepted
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleRevealAnswer(answer.id)}
                        >
                          {revealedAnswers.has(answer.id) ? (
                            <>
                              <EyeOff className="w-4 h-4 mr-2" />
                              Hide Answer
                            </>
                          ) : (
                            <>
                              <Eye className="w-4 h-4 mr-2" />
                              Reveal Answer
                            </>
                          )}
                        </Button>
                        
                        {user && question.user_id === user.id && question.accepted_answer_id !== answer.id && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAcceptAnswer(answer.id)}
                            className="text-green-600 border-green-600 hover:bg-green-50"
                          >
                            <Check className="w-4 h-4 mr-2" />
                            Accept
                          </Button>
                        )}
                      </div>
                    </div>

                    {revealedAnswers.has(answer.id) ? (
                      <MarkdownRenderer content={answer.content} className="mb-4" />
                    ) : (
                      <div className="bg-gray-100 p-4 rounded mb-4 text-center text-gray-600">
                        Click "Reveal Answer" to view this community answer
                      </div>
                    )}

                    <div className="flex items-center text-sm text-gray-500">
                      <User className="w-4 h-4 mr-1" />
                      <span className="mr-4">{answer.profiles?.username || 'Anonymous'}</span>
                      <Clock className="w-4 h-4 mr-1" />
                      <span>{new Date(answer.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Answer Form */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Your Answer</h3>
        </CardHeader>
        <CardContent>
          {user ? (
            <form onSubmit={handleSubmitAnswer}>
              <RichTextEditor
                value={newAnswer}
                onChange={setNewAnswer}
                placeholder="Write your answer here... You can use markdown formatting."
              />
              <Button 
                type="submit" 
                className="mt-4"
                disabled={submitting || !newAnswer.trim()}
              >
                {submitting ? "Posting..." : "Post Your Answer"}
              </Button>
            </form>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">You must be logged in to post an answer.</p>
              <Button onClick={() => navigate('/auth')}>
                Sign In to Answer
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default QuestionDetail;
