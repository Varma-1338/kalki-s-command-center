import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import DashboardLayout from "./DashboardLayout";

type ProblemStatement = {
  id: string;
  title: string;
  description: string;
  max_teams: number;
};

type Team = {
  id: string;
  name: string;
};

type TeamMember = {
  user_id: string;
  profiles?: { full_name: string; email: string } | null;
};

const ParticipantDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [team, setTeam] = useState<Team | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [problems, setProblems] = useState<ProblemStatement[]>([]);
  const [selectionCounts, setSelectionCounts] = useState<Record<string, number>>({});
  const [selectedProblem, setSelectedProblem] = useState<string | null>(null);
  const [confirmProblem, setConfirmProblem] = useState<ProblemStatement | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    // Fetch team membership
    const { data: membership } = await supabase
      .from("team_members")
      .select("team_id")
      .eq("user_id", user!.id)
      .maybeSingle();

    if (membership) {
      const { data: teamData } = await supabase
        .from("teams")
        .select("*")
        .eq("id", membership.team_id)
        .single();
      setTeam(teamData);

      const { data: members } = await supabase
        .from("team_members")
        .select("user_id")
        .eq("team_id", membership.team_id);

      if (members) {
        const memberProfiles = await Promise.all(
          members.map(async (m) => {
            const { data: profile } = await supabase
              .from("profiles")
              .select("full_name, email")
              .eq("user_id", m.user_id)
              .single();
            return { user_id: m.user_id, profiles: profile };
          })
        );
        setTeamMembers(memberProfiles);
      }

      const { data: selection } = await supabase
        .from("team_selections")
        .select("problem_statement_id")
        .eq("team_id", membership.team_id)
        .maybeSingle();
      if (selection) setSelectedProblem(selection.problem_statement_id);
    }

    // Fetch problem statements
    const { data: problemData } = await supabase
      .from("problem_statements")
      .select("*")
      .order("created_at");
    setProblems(problemData || []);

    // Fetch selection counts per problem
    const { data: allSelections } = await supabase.from("team_selections").select("problem_statement_id");
    const counts: Record<string, number> = {};
    (allSelections || []).forEach((s) => {
      counts[s.problem_statement_id] = (counts[s.problem_statement_id] || 0) + 1;
    });
    setSelectionCounts(counts);

    setLoading(false);
  };

  const selectProblem = async (problemId: string) => {
    if (!team) {
      toast({ title: "No Team", description: "You are not assigned to a team yet.", variant: "destructive" });
      return;
    }

    const problem = problems.find((p) => p.id === problemId);
    const currentCount = selectionCounts[problemId] || 0;
    if (problem && problem.max_teams > 0 && currentCount >= problem.max_teams && selectedProblem !== problemId) {
      toast({ title: "No Slots", description: "This problem statement has no available slots.", variant: "destructive" });
      return;
    }

    const { error } = await supabase
      .from("team_selections")
      .upsert({ team_id: team.id, problem_statement_id: problemId }, { onConflict: "team_id" });

    if (error) {
      toast({ title: "Selection failed", description: error.message, variant: "destructive" });
    } else {
      setSelectedProblem(problemId);
      setConfirmProblem(null);
      toast({ title: "Problem Selected!", description: "Your team's choice has been recorded." });
      fetchData(); // refresh counts
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p className="font-display text-xl text-gradient-gold animate-pulse-glow">LOADING MISSION DATA...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-gradient-gold glow-gold">WARRIOR DASHBOARD</h1>
          <p className="text-muted-foreground mt-1">Welcome back, {user?.email}</p>
        </div>

        {/* Team Info */}
        <Card className="bg-card border-border border-glow-gold">
          <CardHeader>
            <CardTitle className="font-display text-xl text-kalki-cyan">
              {team ? `⚔️ Team: ${team.name}` : "⚔️ No Team Assigned"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {team ? (
              <div className="space-y-3">
                <p className="text-muted-foreground">Team Members:</p>
                <div className="flex flex-wrap gap-2">
                  {teamMembers.map((m) => (
                    <Badge key={m.user_id} className="bg-secondary text-secondary-foreground font-body text-sm">
                      {m.profiles?.full_name || m.profiles?.email || "Unknown"}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">Contact the admin to get assigned to a team.</p>
            )}
          </CardContent>
        </Card>

        {/* Problem Statements */}
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground mb-4">CHOOSE YOUR MISSION</h2>
          {problems.length === 0 ? (
            <p className="text-muted-foreground">No problem statements available yet. Stay tuned!</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {problems.map((p) => {
                const count = selectionCounts[p.id] || 0;
                const slotsLeft = p.max_teams > 0 ? p.max_teams - count : null;
                const isFull = slotsLeft !== null && slotsLeft <= 0 && selectedProblem !== p.id;

                return (
                  <Card
                    key={p.id}
                    className={`bg-card border transition-all duration-300 ${
                      selectedProblem === p.id
                        ? "border-primary glow-box-gold"
                        : isFull
                        ? "border-border opacity-60"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <CardHeader>
                      <CardTitle className="font-display text-lg flex items-center justify-between gap-2">
                        <span className="flex-1">{p.title}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          {slotsLeft !== null && (
                            <Badge variant="outline" className={`font-body text-xs ${slotsLeft <= 0 ? "border-destructive text-destructive" : "border-kalki-cyan text-kalki-cyan"}`}>
                              {slotsLeft <= 0 ? "FULL" : `${slotsLeft} slot${slotsLeft !== 1 ? "s" : ""} left`}
                            </Badge>
                          )}
                          {selectedProblem === p.id && (
                            <Badge className="bg-primary text-primary-foreground font-display">SELECTED</Badge>
                          )}
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-muted-foreground">{p.description}</p>
                      {selectedProblem !== p.id && !isFull && (
                        <Button
                          onClick={() => setConfirmProblem(p)}
                          className="font-display tracking-wider bg-primary text-primary-foreground hover:bg-kalki-gold-light w-full"
                        >
                          SELECT THIS MISSION
                        </Button>
                      )}
                      {isFull && (
                        <p className="text-center text-sm text-destructive font-display">NO SLOTS AVAILABLE</p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={!!confirmProblem} onOpenChange={(open) => !open && setConfirmProblem(null)}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display text-gradient-gold">Confirm Selection</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            Are you sure you want to select <span className="text-foreground font-semibold">{confirmProblem?.title}</span> as your team's mission? This will replace any previous selection.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmProblem(null)} className="font-display border-border">
              CANCEL
            </Button>
            <Button onClick={() => confirmProblem && selectProblem(confirmProblem.id)} className="font-display bg-primary text-primary-foreground hover:bg-kalki-gold-light">
              CONFIRM
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default ParticipantDashboard;
