import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import {
  API_BASE_URL,
  getFixtures,
  getSession,
  login,
  logout,
  register,
  type Fixture,
  type SessionUser,
} from "./src/api/client";
import { PrimaryButton } from "./src/components/PrimaryButton";

type AuthMode = "login" | "register";
type Screen = "home" | "fixtures";

export default function App() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);

  async function refreshSession() {
    const session = await getSession();
    setUser(session.authenticated ? session.user : null);
  }

  useEffect(() => {
    refreshSession()
      .catch(() => setUser(null))
      .finally(() => setLoadingSession(false));
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safeArea}>
        {loadingSession ? (
          <View style={styles.center}>
            <Text style={styles.title}>WC2026</Text>
            <Text style={styles.muted}>Connecting...</Text>
          </View>
        ) : user ? (
          <HomeScreen user={user} onSignedOut={() => setUser(null)} />
        ) : (
          <AuthScreen onAuthed={(nextUser) => setUser(nextUser)} />
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

function AuthScreen({ onAuthed }: { onAuthed: (user: SessionUser) => void }) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register({ name, email, password, inviteCode });
      }
      const session = await getSession();
      if (!session.authenticated) throw new Error("Signed in, but no session was returned.");
      onAuthed(session.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.flex}
    >
      <ScrollView contentContainerStyle={styles.authContent} keyboardShouldPersistTaps="handled">
        <View style={styles.brandMark}>
          <Text style={styles.brandMarkText}>26</Text>
        </View>
        <Text style={styles.eyebrow}>WC2026 FRIENDS POOL</Text>
        <Text style={styles.title}>{mode === "login" ? "Sign in" : "Create account"}</Text>
        <Text style={styles.bodyText}>
          Make picks, manage leagues, and follow the table from your phone.
        </Text>

        <View style={styles.panel}>
          {mode === "register" ? (
            <Field label="Display name" value={name} onChangeText={setName} autoCapitalize="words" />
          ) : null}
          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
          <Field
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
          />
          {mode === "register" ? (
            <Field
              label="Invite code"
              value={inviteCode}
              onChangeText={setInviteCode}
              autoCapitalize="characters"
              placeholder="Optional for first league"
            />
          ) : null}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <PrimaryButton loading={busy} onPress={submit}>
            {mode === "login" ? "Sign in" : "Create account"}
          </PrimaryButton>

          <PrimaryButton
            disabled={busy}
            variant="secondary"
            onPress={() => {
              setMode(mode === "login" ? "register" : "login");
              setError(null);
            }}
          >
            {mode === "login" ? "New here? Create account" : "Already registered? Sign in"}
          </PrimaryButton>
        </View>

        <Text style={styles.endpoint}>API: {API_BASE_URL}</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function HomeScreen({
  user,
  onSignedOut,
}: {
  user: SessionUser;
  onSignedOut: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [screen, setScreen] = useState<Screen>("home");
  const appLinks = [
    ["Dashboard", "/dashboard"],
    ["Predictions", "/predictions"],
    ["Leagues", "/leagues"],
    ["Leaderboard", "/leaderboard"],
  ] as const;

  async function signOut() {
    setBusy(true);
    try {
      await logout();
    } finally {
      setBusy(false);
      onSignedOut();
    }
  }

  if (screen === "fixtures") {
    return <FixturesScreen onBack={() => setScreen("home")} />;
  }

  return (
    <ScrollView contentContainerStyle={styles.homeContent}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.eyebrow}>SIGNED IN</Text>
          <Text style={styles.title}>Hi, {user.name}</Text>
          <Text style={styles.muted}>{user.email}</Text>
        </View>
        <View style={styles.rolePill}>
          <Text style={styles.rolePillText}>{user.role}</Text>
        </View>
      </View>

      <View style={styles.panel}>
        <Text style={styles.sectionTitle}>Native app shell ready</Text>
        <Text style={styles.bodyText}>
          Authentication is connected to the existing WC2026 backend. Fixtures now load natively;
          the remaining screens can replace these web links one by one.
        </Text>
        <PrimaryButton variant="secondary" onPress={() => setScreen("fixtures")}>
          View Fixtures
        </PrimaryButton>
        {appLinks.map(([label, path]) => (
          <PrimaryButton key={path} variant="secondary" onPress={() => void Linking.openURL(`${API_BASE_URL}${path}`)}>
            Open {label}
          </PrimaryButton>
        ))}
      </View>

      <PrimaryButton loading={busy} onPress={signOut}>
        Sign out
      </PrimaryButton>
    </ScrollView>
  );
}

function FixturesScreen({ onBack }: { onBack: () => void }) {
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getFixtures()
      .then((response) => {
        setFixtures(response.matches);
        setError(null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load fixtures."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.homeContent}>
      <PrimaryButton variant="secondary" onPress={onBack}>
        Back
      </PrimaryButton>
      <View>
        <Text style={styles.eyebrow}>WORLD CUP 2026</Text>
        <Text style={styles.title}>Fixtures</Text>
        <Text style={styles.muted}>{fixtures.length} matches</Text>
      </View>

      {loading ? (
        <View style={styles.panel}>
          <ActivityIndicator color="#8ee620" />
          <Text style={styles.muted}>Loading fixtures...</Text>
        </View>
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        fixtures.slice(0, 24).map((fixture) => <FixtureCard key={fixture.id} fixture={fixture} />)
      )}
    </ScrollView>
  );
}

function FixtureCard({ fixture }: { fixture: Fixture }) {
  const kickoff = new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(fixture.kickoffAtUtc));
  const home = fixture.homeTeamId ?? fixture.homePlaceholder ?? "TBD";
  const away = fixture.awayTeamId ?? fixture.awayPlaceholder ?? "TBD";

  return (
    <View style={styles.fixtureCard}>
      <View style={styles.fixtureMetaRow}>
        <Text style={styles.fixtureMeta}>Match {fixture.number}</Text>
        <Text style={styles.fixtureMeta}>{fixture.group ? `Group ${fixture.group}` : fixture.stage.toUpperCase()}</Text>
      </View>
      <View style={styles.scoreRow}>
        <Text style={styles.teamName}>{home}</Text>
        <Text style={styles.scoreText}>
          {fixture.homeScore === null || fixture.awayScore === null
            ? "vs"
            : `${fixture.homeScore}-${fixture.awayScore}`}
        </Text>
        <Text style={[styles.teamName, styles.teamNameRight]}>{away}</Text>
      </View>
      <Text style={styles.muted}>{kickoff}</Text>
      <Text style={styles.muted}>{fixture.venue}</Text>
    </View>
  );
}

function Field({
  label,
  ...inputProps
}: {
  label: string;
} & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...inputProps}
        placeholderTextColor="#8090a6"
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: "#061321",
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  center: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  authContent: {
    gap: 18,
    padding: 20,
    paddingTop: 36,
  },
  homeContent: {
    gap: 20,
    padding: 20,
  },
  brandMark: {
    alignItems: "center",
    borderColor: "#f7b23b",
    borderRadius: 999,
    borderWidth: 2,
    height: 54,
    justifyContent: "center",
    width: 54,
  },
  brandMarkText: {
    color: "#f7b23b",
    fontSize: 18,
    fontWeight: "900",
  },
  eyebrow: {
    color: "#f7b23b",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0,
  },
  title: {
    color: "#e8f0ff",
    fontSize: 32,
    fontWeight: "900",
  },
  sectionTitle: {
    color: "#e8f0ff",
    fontSize: 22,
    fontWeight: "900",
  },
  bodyText: {
    color: "#b9c3d4",
    fontSize: 15,
    lineHeight: 22,
  },
  muted: {
    color: "#9aa8bd",
    fontSize: 14,
  },
  panel: {
    backgroundColor: "#132235",
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 18,
    borderWidth: 1,
    gap: 14,
    padding: 16,
  },
  field: {
    gap: 7,
  },
  label: {
    color: "#cfd8ea",
    fontSize: 13,
    fontWeight: "800",
  },
  input: {
    backgroundColor: "#223149",
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 12,
    borderWidth: 1,
    color: "#e8f0ff",
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: 14,
  },
  error: {
    borderColor: "#ff6565",
    borderRadius: 10,
    borderWidth: 1,
    color: "#ffb7b7",
    padding: 10,
  },
  endpoint: {
    color: "#718097",
    fontSize: 12,
    textAlign: "center",
  },
  headerRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  rolePill: {
    backgroundColor: "rgba(142, 230, 32, 0.14)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  rolePillText: {
    color: "#8ee620",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  fixtureCard: {
    backgroundColor: "#132235",
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
    padding: 16,
  },
  fixtureMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  fixtureMeta: {
    color: "#f7b23b",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  scoreRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  teamName: {
    color: "#e8f0ff",
    flex: 1,
    fontSize: 16,
    fontWeight: "900",
    textTransform: "capitalize",
  },
  teamNameRight: {
    textAlign: "right",
  },
  scoreText: {
    color: "#8ee620",
    fontSize: 18,
    fontWeight: "900",
  },
});
