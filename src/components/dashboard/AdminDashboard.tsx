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
import { Checkbox } from "@/components/ui/checkbox";
import { Upload, Download, Key, FileSpreadsheet, Users, ClipboardCheck } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DashboardLayout from "./DashboardLayout";
import * as XLSX from "xlsx";

type ProblemStatement = { id: string; title: string; description: string; max_teams: number };
type TeamMember = { id: string; member_name: string; member_email: string };
type TeamWithDetails = {
  id: string;
  name: string;
  login_key: string | null;
  members: TeamMember[];
  selection?: string;
};
type AttendanceRecord = {
  team_member_id: string;
  present: boolean;
};

const AdminDashboard = () => {
  const { toast } = useToast();
  const [problems, setProblems] = useState<ProblemStatement[]>([]);
  const [teams, setTeams] = useState<TeamWithDetails[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newMaxTeams, setNewMaxTeams] = useState("0");
  const [editProblem, setEditProblem] = useState<ProblemStatement | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadingExcel, setUploadingExcel] = useState(false);
  const [generatingKeys, setGeneratingKeys] = useState(false);
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split("T")[0]);
  const [attendanceData, setAttendanceData] = useState<Record<string, boolean>>({});
  const [savingAttendance, setSavingAttendance] = useState(false);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    const { data: problemData } = await supabase.from("problem_statements").select("*").order("created_at");
    setProblems(problemData || []);

    const { data: teamsData } = await supabase.from("teams").select("*").order("created_at");
    if (teamsData) {
      const enriched = await Promise.all(
        teamsData.map(async (t: any) => {
          const { data: members } = await supabase
            .from("team_members")
            .select("id, member_name, member_email")
            .eq("team_id", t.id);
          const { data: sel } = await supabase
            .from("team_selections")
            .select("problem_statement_id")
            .eq("team_id", t.id)
            .maybeSingle();
          const problemTitle = sel ? problemData?.find((p) => p.id === sel.problem_statement_id)?.title : undefined;
          return {
            id: t.id,
            name: t.name,
            login_key: t.login_key,
            members: (members || []) as TeamMember[],
            selection: problemTitle,
          };
        })
      );
      setTeams(enriched);
    }
    setLoading(false);
  };

  const addProblem = async () => {
    if (!newTitle.trim()) return;
    const { error } = await supabase.from("problem_statements").insert({
      title: newTitle,
      description: newDesc,
      max_teams: parseInt(newMaxTeams) || 0,
    });
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
    const { error } = await supabase
      .from("problem_statements")
      .update({ title: editProblem.title, description: editProblem.description, max_teams: editProblem.max_teams })
      .eq("id", editProblem.id);
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

  const deleteTeam = async (id: string) => {
    const { error } = await supabase.from("teams").delete().eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Team Deleted!" });
      fetchAll();
    }
  };

  // Excel upload handler
  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingExcel(true);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(sheet);

      // Expected columns: Team Name, Member Name, Member Email
      const teamMap = new Map<string, { name: string; email: string }[]>();
      for (const row of rows) {
        const teamName = (row["Team Name"] || row["team_name"] || row["TeamName"] || "").toString().trim();
        const memberName = (row["Member Name"] || row["member_name"] || row["MemberName"] || row["Name"] || "").toString().trim();
        const memberEmail = (row["Member Email"] || row["member_email"] || row["MemberEmail"] || row["Email"] || "").toString().trim();
        if (!teamName) continue;
        if (!teamMap.has(teamName)) teamMap.set(teamName, []);
        if (memberName || memberEmail) {
          teamMap.get(teamName)!.push({ name: memberName, email: memberEmail });
        }
      }

      if (teamMap.size === 0) {
        toast({ title: "No teams found", description: "Excel must have columns: Team Name, Member Name, Member Email", variant: "destructive" });
        setUploadingExcel(false);
        return;
      }

      let created = 0;
      for (const [teamName, members] of teamMap) {
        const { data: teamData, error: teamError } = await supabase
          .from("teams")
          .insert({ name: teamName })
          .select("id")
          .single();

        if (teamError) {
          console.error("Error creating team:", teamName, teamError.message);
          continue;
        }

        if (members.length > 0) {
          const memberInserts = members.map((m) => ({
            team_id: teamData.id,
            member_name: m.name,
            member_email: m.email,
          }));
          await supabase.from("team_members").insert(memberInserts);
        }
        created++;
      }

      toast({ title: `${created} teams imported!`, description: `From ${rows.length} rows in the Excel file.` });
      fetchAll();
    } catch (err: any) {
      toast({ title: "Excel Error", description: err.message, variant: "destructive" });
    }
    setUploadingExcel(false);
    if (excelInputRef.current) excelInputRef.current.value = "";
  };

  // Generate unique keys for all teams without one
  const generateCredentials = async () => {
    setGeneratingKeys(true);
    const teamsWithoutKeys = teams.filter((t) => !t.login_key);
    if (teamsWithoutKeys.length === 0) {
      toast({ title: "All teams already have keys!" });
      setGeneratingKeys(false);
      return;
    }

    for (const team of teamsWithoutKeys) {
      const key = generateKey();
      await supabase.from("teams").update({ login_key: key }).eq("id", team.id);
    }

    toast({ title: `Generated keys for ${teamsWithoutKeys.length} teams!` });
    fetchAll();
    setGeneratingKeys(false);
  };

  const generateKey = (): string => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let key = "";
    for (let i = 0; i < 8; i++) {
      key += chars[Math.floor(Math.random() * chars.length)];
    }
    return key;
  };

  // Download credentials as Excel
  const downloadCredentials = () => {
    const rows = teams.map((t) => ({
      "Team Name": t.name,
      "Login Key": t.login_key || "Not generated",
      Members: t.members.map((m) => m.member_name || m.member_email).join(", "),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Credentials");
    XLSX.writeFile(wb, "team_credentials.xlsx");
  };

  // Audio upload
  const uploadAudio = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const filePath = `background-audio.${file.name.split(".").pop()}`;
    await supabase.storage.from("audio").remove([filePath]);
    const { error: uploadError } = await supabase.storage.from("audio").upload(filePath, file, { upsert: true });
    if (uploadError) {
      toast({ title: "Upload Failed", description: uploadError.message, variant: "destructive" });
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("audio").getPublicUrl(filePath);
    const { error: settingsError } = await supabase
      .from("app_settings")
      .upsert({ key: "background_audio_url", value: urlData.publicUrl }, { onConflict: "key" });
    if (settingsError) toast({ title: "Error", description: settingsError.message, variant: "destructive" });
    else toast({ title: "Audio Updated!" });
    setUploading(false);
  };

  // Attendance
  const loadAttendance = async () => {
    const allMemberIds = teams.flatMap((t) => t.members.map((m) => m.id));
    if (allMemberIds.length === 0) return;

    const { data } = await supabase
      .from("attendance")
      .select("team_member_id, present")
      .eq("date", attendanceDate)
      .in("team_member_id", allMemberIds);

    const map: Record<string, boolean> = {};
    (data || []).forEach((r: any) => {
      map[r.team_member_id] = r.present;
    });
    setAttendanceData(map);
  };

  useEffect(() => {
    if (teams.length > 0) loadAttendance();
  }, [attendanceDate, teams]);

  const toggleAttendance = (memberId: string) => {
    setAttendanceData((prev) => ({ ...prev, [memberId]: !prev[memberId] }));
  };

  const saveAttendance = async () => {
    setSavingAttendance(true);
    const entries = Object.entries(attendanceData).map(([team_member_id, present]) => ({
      team_member_id,
      date: attendanceDate,
      present,
    }));

    for (const entry of entries) {
      await supabase.from("attendance").upsert(entry, { onConflict: "team_member_id,date" });
    }

    toast({ title: "Attendance Saved!" });
    setSavingAttendance(false);
  };

  const downloadAttendance = async () => {
    const allMemberIds = teams.flatMap((t) => t.members.map((m) => m.id));
    if (allMemberIds.length === 0) return;

    const { data } = await supabase.from("attendance").select("*").in("team_member_id", allMemberIds).order("date");

    const rows: any[] = [];
    for (const team of teams) {
      for (const member of team.members) {
        const memberAttendance = (data || []).filter((a: any) => a.team_member_id === member.id);
        for (const a of memberAttendance) {
          rows.push({
            "Team Name": team.name,
            "Member Name": member.member_name,
            "Member Email": member.member_email,
            Date: a.date,
            Present: a.present ? "Yes" : "No",
          });
        }
        if (memberAttendance.length === 0) {
          rows.push({
            "Team Name": team.name,
            "Member Name": member.member_name,
            "Member Email": member.member_email,
            Date: "-",
            Present: "-",
          });
        }
      }
    }

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance");
    XLSX.writeFile(wb, "attendance_report.xlsx");
  };

  const downloadReport = () => {
    const rows = teams.map((t) => ({
      "Team Name": t.name,
      Members: t.members.map((m) => m.member_name || m.member_email).join("; "),
      "Selected Problem": t.selection || "None",
      "Login Key": t.login_key || "N/A",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, "hackathon_report.xlsx");
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
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold text-gradient-gold glow-gold">COMMAND CENTER</h1>
            <p className="text-muted-foreground mt-1">Admin Control Panel</p>
          </div>
          <Button onClick={downloadReport} variant="outline" className="font-display tracking-wider border-kalki-cyan text-kalki-cyan">
            <Download className="h-4 w-4 mr-2" /> DOWNLOAD REPORT
          </Button>
        </div>

        <Tabs defaultValue="teams" className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-secondary">
            <TabsTrigger value="teams" className="font-display text-xs tracking-wider data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Users className="h-3 w-3 mr-1" /> TEAMS
            </TabsTrigger>
            <TabsTrigger value="problems" className="font-display text-xs tracking-wider data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              📋 PROBLEMS
            </TabsTrigger>
            <TabsTrigger value="attendance" className="font-display text-xs tracking-wider data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <ClipboardCheck className="h-3 w-3 mr-1" /> ATTENDANCE
            </TabsTrigger>
            <TabsTrigger value="settings" className="font-display text-xs tracking-wider data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              ⚙️ SETTINGS
            </TabsTrigger>
          </TabsList>

          {/* TEAMS TAB */}
          <TabsContent value="teams" className="mt-6 space-y-6">
            {/* Excel Upload */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="font-display text-lg text-kalki-cyan flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5" /> IMPORT TEAMS FROM EXCEL
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Upload an Excel file with columns: <strong>Team Name</strong>, <strong>Member Name</strong>, <strong>Member Email</strong>
                </p>
                <div className="flex items-center gap-4">
                  <input ref={excelInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleExcelUpload} className="hidden" />
                  <Button onClick={() => excelInputRef.current?.click()} disabled={uploadingExcel} className="font-display bg-primary text-primary-foreground hover:bg-kalki-gold-light">
                    <Upload className="h-4 w-4 mr-2" />
                    {uploadingExcel ? "IMPORTING..." : "UPLOAD EXCEL"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Generate Credentials */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="font-display text-lg text-kalki-cyan flex items-center gap-2">
                  <Key className="h-5 w-5" /> TEAM CREDENTIALS
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-3 flex-wrap">
                  <Button onClick={generateCredentials} disabled={generatingKeys} className="font-display bg-primary text-primary-foreground hover:bg-kalki-gold-light">
                    <Key className="h-4 w-4 mr-2" />
                    {generatingKeys ? "GENERATING..." : "GENERATE KEYS"}
                  </Button>
                  <Button onClick={downloadCredentials} variant="outline" className="font-display border-kalki-cyan text-kalki-cyan">
                    <Download className="h-4 w-4 mr-2" /> DOWNLOAD CREDENTIALS
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Teams List */}
            <div className="space-y-3">
              {teams.length === 0 && <p className="text-muted-foreground text-center py-8">No teams yet. Upload an Excel file to import teams.</p>}
              {teams.map((t) => (
                <Card key={t.id} className="bg-card border-border">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-display font-semibold text-foreground text-lg">{t.name}</p>
                        {t.login_key && (
                          <Badge className="bg-secondary text-kalki-cyan font-mono text-xs mt-1">
                            Key: {t.login_key}
                          </Badge>
                        )}
                        {t.selection && (
                          <Badge className="bg-primary/20 text-primary font-body ml-2 mt-1">
                            Mission: {t.selection}
                          </Badge>
                        )}
                      </div>
                      <Button variant="outline" size="sm" onClick={() => deleteTeam(t.id)} className="font-display text-xs border-destructive text-destructive">
                        DELETE
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {t.members.map((m) => (
                        <Badge key={m.id} variant="outline" className="border-border text-muted-foreground font-body">
                          {m.member_name || m.member_email || "Unknown"}
                        </Badge>
                      ))}
                      {t.members.length === 0 && <p className="text-sm text-muted-foreground">No members</p>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* PROBLEMS TAB */}
          <TabsContent value="problems" className="mt-6 space-y-4">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="font-display text-lg text-kalki-cyan">ADD PROBLEM STATEMENT</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-[1fr,2fr,auto,auto]">
                  <Input placeholder="Title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className="bg-secondary border-border" />
                  <Input placeholder="Description" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} className="bg-secondary border-border" />
                  <Input placeholder="Max teams" type="number" value={newMaxTeams} onChange={(e) => setNewMaxTeams(e.target.value)} className="bg-secondary border-border w-40" />
                  <Button onClick={addProblem} className="font-display bg-primary text-primary-foreground hover:bg-kalki-gold-light">ADD</Button>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-2">
              {problems.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary border border-border">
                  <div>
                    <p className="font-display font-semibold text-foreground">
                      {p.title}
                      <span className="text-xs text-muted-foreground ml-2">
                        (Max: {p.max_teams === 0 ? "∞" : p.max_teams})
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
          </TabsContent>

          {/* ATTENDANCE TAB */}
          <TabsContent value="attendance" className="mt-6 space-y-4">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="font-display text-lg text-kalki-cyan flex items-center gap-2">
                  <ClipboardCheck className="h-5 w-5" /> MARK ATTENDANCE
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="space-y-1">
                    <Label className="text-foreground text-sm">Date</Label>
                    <Input
                      type="date"
                      value={attendanceDate}
                      onChange={(e) => setAttendanceDate(e.target.value)}
                      className="bg-secondary border-border w-48"
                    />
                  </div>
                  <div className="flex gap-2 items-end">
                    <Button onClick={saveAttendance} disabled={savingAttendance} className="font-display bg-primary text-primary-foreground hover:bg-kalki-gold-light">
                      {savingAttendance ? "SAVING..." : "SAVE ATTENDANCE"}
                    </Button>
                    <Button onClick={downloadAttendance} variant="outline" className="font-display border-kalki-cyan text-kalki-cyan">
                      <Download className="h-4 w-4 mr-2" /> DOWNLOAD EXCEL
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {teams.map((team) => (
              <Card key={team.id} className="bg-card border-border">
                <CardContent className="p-4 space-y-2">
                  <p className="font-display font-semibold text-foreground">{team.name}</p>
                  {team.members.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No members</p>
                  ) : (
                    <div className="space-y-2">
                      {team.members.map((m) => (
                        <div key={m.id} className="flex items-center gap-3 p-2 rounded bg-secondary/50">
                          <Checkbox
                            checked={attendanceData[m.id] || false}
                            onCheckedChange={() => toggleAttendance(m.id)}
                          />
                          <div className="flex-1">
                            <span className="text-foreground text-sm">{m.member_name || "Unknown"}</span>
                            {m.member_email && (
                              <span className="text-muted-foreground text-xs ml-2">({m.member_email})</span>
                            )}
                          </div>
                          <Badge variant="outline" className={`text-xs ${attendanceData[m.id] ? "border-green-500 text-green-500" : "border-destructive text-destructive"}`}>
                            {attendanceData[m.id] ? "PRESENT" : "ABSENT"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* SETTINGS TAB */}
          <TabsContent value="settings" className="mt-6 space-y-4">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="font-display text-lg text-kalki-cyan">🎵 BACKGROUND AUDIO</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <input ref={audioInputRef} type="file" accept="audio/*" onChange={uploadAudio} className="hidden" />
                  <Button onClick={() => audioInputRef.current?.click()} disabled={uploading} className="font-display bg-primary text-primary-foreground hover:bg-kalki-gold-light">
                    <Upload className="h-4 w-4 mr-2" />
                    {uploading ? "UPLOADING..." : "UPLOAD AUDIO"}
                  </Button>
                  <p className="text-sm text-muted-foreground">Upload background music for all pages.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
