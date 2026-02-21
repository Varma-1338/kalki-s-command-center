import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Upload } from "lucide-react";
import DashboardLayout from "./DashboardLayout";

type ProblemStatement = { id: string; title: string; description: string; max_teams: number };
type TeamWithSelection = {
  id: string;
  name: string;
  members: { full_name: string; email: string }[];
  selection?: string;
};

const AdminDashboard = () => {
  const { toast } = useToast();
  const [problems, setProblems] = useState<ProblemStatement[]>([]);
  const [teams, setTeams] = useState<TeamWithSelection[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newMaxTeams, setNewMaxTeams] = useState("0");
  const [newTeamName, setNewTeamName] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [selectedTeamForMember, setSelectedTeamForMember] = useState<string | null>(null);
  const [editProblem, setEditProblem] = useState<ProblemStatement | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const audioInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    const { data: problemData } = await supabase.from("problem_statements").select("*").order("created_at");
    setProblems(problemData || []);

    const { data: teamsData } = await supabase.from("teams").select("*").order("created_at");
    if (teamsData) {
      const enriched = await Promise.all(
        teamsData.map(async (t) => {
          const { data: members } = await supabase.from("team_members").select("user_id").eq("team_id", t.id);
          const memberProfiles = await Promise.all(
            (members || []).map(async (m) => {
              const { data: p } = await supabase.from("profiles").select("full_name, email").eq("user_id", m.user_id).single();
              return { full_name: p?.full_name || "", email: p?.email || "" };
            })
          );
          const { data: sel } = await supabase.from("team_selections").select("problem_statement_id").eq("team_id", t.id).maybeSingle();
          const problemTitle = sel ? problemData?.find((p) => p.id === sel.problem_statement_id)?.title : undefined;
          return { id: t.id, name: t.name, members: memberProfiles, selection: problemTitle };
        })
      );
      setTeams(enriched);
    }
    setLoading(false);
  };

  const addProblem = async () => {
    if (!newTitle.trim()) return;
    const { error } = await supabase.from("problem_statements").insert({ title: newTitle, description: newDesc, max_teams: parseInt(newMaxTeams) || 0 });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Problem Statement Added!" });
      setNewTitle("");
      setNewDesc("");
      setNewMaxTeams("0");
      fetchAll();
    }
  };

  const updateProblem = async () => {
    if (!editProblem) return;
    const { error } = await supabase.from("problem_statements").update({ title: editProblem.title, description: editProblem.description, max_teams: editProblem.max_teams }).eq("id", editProblem.id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Updated!" });
      setEditProblem(null);
      fetchAll();
    }
  };

  const deleteProblem = async (id: string) => {
    const { error } = await supabase.from("problem_statements").delete().eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Deleted!" });
      fetchAll();
    }
  };

  const addTeam = async () => {
    if (!newTeamName.trim()) return;
    const { error } = await supabase.from("teams").insert({ name: newTeamName });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Team Created!" });
      setNewTeamName("");
      fetchAll();
    }
  };

  const deleteTeam = async (id: string) => {
    const { error } = await supabase.from("teams").delete().eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Team Deleted!" });
      fetchAll();
    }
  };

  const addMemberToTeam = async () => {
    if (!selectedTeamForMember || !newMemberEmail.trim()) return;
    const { data: profile } = await supabase.from("profiles").select("user_id").eq("email", newMemberEmail.trim()).maybeSingle();
    if (!profile) {
      toast({ title: "User not found", description: "No user with that email.", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("team_members").insert({ team_id: selectedTeamForMember, user_id: profile.user_id });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Member Added!" });
      setNewMemberEmail("");
      setSelectedTeamForMember(null);
      fetchAll();
    }
  };

  const uploadAudio = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    const filePath = `background-audio.${file.name.split(".").pop()}`;

    // Remove old file if exists
    await supabase.storage.from("audio").remove([filePath]);

    const { error: uploadError } = await supabase.storage.from("audio").upload(filePath, file, { upsert: true });
    if (uploadError) {
      toast({ title: "Upload Failed", description: uploadError.message, variant: "destructive" });
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("audio").getPublicUrl(filePath);

    // Upsert the setting
    const { error: settingsError } = await supabase.from("app_settings").upsert(
      { key: "background_audio_url", value: urlData.publicUrl },
      { onConflict: "key" }
    );

    if (settingsError) {
      toast({ title: "Error", description: settingsError.message, variant: "destructive" });
    } else {
      toast({ title: "Audio Updated!", description: "Background audio has been changed." });
    }
    setUploading(false);
  };

  const downloadReport = () => {
    const csv = [
      ["Team Name", "Members", "Selected Problem Statement"],
      ...teams.map((t) => [
        t.name,
        t.members.map((m) => m.full_name || m.email).join("; "),
        t.selection || "None",
      ]),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "kalki_hackathon_report.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p className="font-display text-xl text-gradient-gold animate-pulse-glow">LOADING COMMAND CENTER...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold text-gradient-gold glow-gold">COMMAND CENTER</h1>
            <p className="text-muted-foreground mt-1">Admin Control Panel</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button onClick={downloadReport} className="font-display tracking-wider bg-kalki-cyan text-accent-foreground hover:bg-kalki-cyan-glow">
              DOWNLOAD REPORT
            </Button>
          </div>
        </div>

        {/* Audio Management */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="font-display text-xl text-kalki-cyan">🎵 BACKGROUND AUDIO</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <input ref={audioInputRef} type="file" accept="audio/*" onChange={uploadAudio} className="hidden" />
              <Button
                onClick={() => audioInputRef.current?.click()}
                disabled={uploading}
                className="font-display bg-primary text-primary-foreground hover:bg-kalki-gold-light"
              >
                <Upload className="h-4 w-4 mr-2" />
                {uploading ? "UPLOADING..." : "UPLOAD AUDIO"}
              </Button>
              <p className="text-sm text-muted-foreground">Upload an audio file to play as background music across the app.</p>
            </div>
          </CardContent>
        </Card>

        {/* Problem Statements Management */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="font-display text-xl text-kalki-cyan">📋 PROBLEM STATEMENTS</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-[1fr,2fr,auto,auto]">
              <Input placeholder="Title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className="bg-secondary border-border" />
              <Input placeholder="Description" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} className="bg-secondary border-border" />
              <Input placeholder="Max teams (0=unlimited)" type="number" value={newMaxTeams} onChange={(e) => setNewMaxTeams(e.target.value)} className="bg-secondary border-border w-40" />
              <Button onClick={addProblem} className="font-display bg-primary text-primary-foreground hover:bg-kalki-gold-light">ADD</Button>
            </div>

            <div className="space-y-2 mt-4">
              {problems.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary border border-border">
                  <div>
                    <p className="font-display font-semibold text-foreground">
                      {p.title}
                      <span className="text-xs text-muted-foreground ml-2">
                        (Max teams: {p.max_teams === 0 ? "Unlimited" : p.max_teams})
                      </span>
                    </p>
                    <p className="text-sm text-muted-foreground">{p.description}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" onClick={() => setEditProblem({ ...p })} className="font-display text-xs border-kalki-cyan text-kalki-cyan">
                          EDIT
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-card border-border">
                        <DialogHeader>
                          <DialogTitle className="font-display text-gradient-gold">Edit Problem Statement</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label className="text-foreground">Title</Label>
                            <Input value={editProblem?.title || ""} onChange={(e) => setEditProblem((prev) => prev ? { ...prev, title: e.target.value } : null)} className="bg-secondary border-border" />
                          </div>
                          <div>
                            <Label className="text-foreground">Description</Label>
                            <Textarea value={editProblem?.description || ""} onChange={(e) => setEditProblem((prev) => prev ? { ...prev, description: e.target.value } : null)} className="bg-secondary border-border" />
                          </div>
                          <div>
                            <Label className="text-foreground">Max Teams (0 = unlimited)</Label>
                            <Input type="number" value={editProblem?.max_teams ?? 0} onChange={(e) => setEditProblem((prev) => prev ? { ...prev, max_teams: parseInt(e.target.value) || 0 } : null)} className="bg-secondary border-border" />
                          </div>
                          <Button onClick={updateProblem} className="font-display bg-primary text-primary-foreground w-full">UPDATE</Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                    <Button variant="outline" size="sm" onClick={() => deleteProblem(p.id)} className="font-display text-xs border-destructive text-destructive">
                      DELETE
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Teams Management */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="font-display text-xl text-kalki-cyan">👥 TEAMS</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <Input placeholder="Team name" value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} className="bg-secondary border-border" />
              <Button onClick={addTeam} className="font-display bg-primary text-primary-foreground hover:bg-kalki-gold-light">CREATE TEAM</Button>
            </div>

            <div className="space-y-3 mt-4">
              {teams.map((t) => (
                <div key={t.id} className="p-4 rounded-lg bg-secondary border border-border space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-display font-semibold text-foreground text-lg">{t.name}</p>
                      {t.selection && (
                        <Badge className="bg-primary/20 text-primary font-body mt-1">
                          Selected: {t.selection}
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" onClick={() => setSelectedTeamForMember(t.id)} className="font-display text-xs border-kalki-cyan text-kalki-cyan">
                            ADD MEMBER
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-card border-border">
                          <DialogHeader>
                            <DialogTitle className="font-display text-gradient-gold">Add Member to {t.name}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label className="text-foreground">Member Email</Label>
                              <Input value={newMemberEmail} onChange={(e) => setNewMemberEmail(e.target.value)} placeholder="member@email.com" className="bg-secondary border-border" />
                            </div>
                            <Button onClick={addMemberToTeam} className="font-display bg-primary text-primary-foreground w-full">ADD</Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                      <Button variant="outline" size="sm" onClick={() => deleteTeam(t.id)} className="font-display text-xs border-destructive text-destructive">
                        DELETE
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {t.members.map((m, i) => (
                      <Badge key={i} variant="outline" className="border-border text-muted-foreground font-body">
                        {m.full_name || m.email}
                      </Badge>
                    ))}
                    {t.members.length === 0 && <p className="text-sm text-muted-foreground">No members yet</p>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Selection Report */}
        <Card className="bg-card border-border border-glow-gold">
          <CardHeader>
            <CardTitle className="font-display text-xl text-kalki-cyan">📊 SELECTION REPORT</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-border">
                    <th className="font-display text-sm text-muted-foreground py-3 px-4">TEAM</th>
                    <th className="font-display text-sm text-muted-foreground py-3 px-4">MEMBERS</th>
                    <th className="font-display text-sm text-muted-foreground py-3 px-4">SELECTED PROBLEM</th>
                  </tr>
                </thead>
                <tbody>
                  {teams.map((t) => (
                    <tr key={t.id} className="border-b border-border/50">
                      <td className="py-3 px-4 font-semibold text-foreground">{t.name}</td>
                      <td className="py-3 px-4 text-muted-foreground">{t.members.map((m) => m.full_name || m.email).join(", ") || "—"}</td>
                      <td className="py-3 px-4">
                        {t.selection ? (
                          <Badge className="bg-primary/20 text-primary font-body">{t.selection}</Badge>
                        ) : (
                          <span className="text-muted-foreground">Not selected</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
