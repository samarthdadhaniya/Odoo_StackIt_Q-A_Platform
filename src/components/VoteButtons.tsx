
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface VoteButtonsProps {
  answerId: string;
  initialVoteCount: number;
  initialUserVote: number;
  onVoteChange?: (newCount: number) => void;
}

export const VoteButtons = ({ 
  answerId, 
  initialVoteCount, 
  initialUserVote,
  onVoteChange 
}: VoteButtonsProps) => {
  const [voteCount, setVoteCount] = useState(initialVoteCount);
  const [userVote, setUserVote] = useState(initialUserVote);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleVote = async (voteType: 1 | -1) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to vote on answers.",
      });
      return;
    }

    setLoading(true);
    
    try {
      if (userVote === voteType) {
        // Remove vote
        const { error } = await supabase
          .from('votes')
          .delete()
          .eq('answer_id', answerId)
          .eq('user_id', user.id);
        
        if (error) throw error;
        
        const newCount = voteCount - voteType;
        setVoteCount(newCount);
        setUserVote(0);
        onVoteChange?.(newCount);
      } else {
        // Add or update vote
        const { error } = await supabase
          .from('votes')
          .upsert({
            answer_id: answerId,
            user_id: user.id,
            vote_type: voteType,
          });
        
        if (error) throw error;
        
        const newCount = voteCount + voteType - userVote;
        setVoteCount(newCount);
        setUserVote(voteType);
        onVoteChange?.(newCount);
      }
    } catch (error) {
      console.error('Error voting:', error);
      toast({
        title: "Error",
        description: "Failed to submit vote. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center space-y-1">
      <Button
        variant={userVote === 1 ? "default" : "outline"}
        size="sm"
        onClick={() => handleVote(1)}
        disabled={loading}
        className="w-8 h-8 p-0"
      >
        <ChevronUp className="w-4 h-4" />
      </Button>
      
      <span className={`text-sm font-medium ${
        voteCount > 0 ? 'text-green-600' : 
        voteCount < 0 ? 'text-red-600' : 
        'text-gray-600'
      }`}>
        {voteCount}
      </span>
      
      <Button
        variant={userVote === -1 ? "default" : "outline"}
        size="sm"
        onClick={() => handleVote(-1)}
        disabled={loading}
        className="w-8 h-8 p-0"
      >
        <ChevronDown className="w-4 h-4" />
      </Button>
    </div>
  );
};
