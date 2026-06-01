import { dashboardCardClass } from "@/components/dashboard/dashboard-styles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const scores = [
  { label: "Spiritual", value: 85, color: "text-success" },
  { label: "Academics", value: 72, color: "text-accent" },
  { label: "Coding", value: 68, color: "text-accent" },
  { label: "Business", value: 55, color: "text-warning" },
  { label: "Health", value: 60, color: "text-success" },
];

export function DailyScore() {
  const average = Math.round(
    scores.reduce((sum, s) => sum + s.value, 0) / scores.length
  );

  return (
    <Card className={dashboardCardClass()}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Daily Score</CardTitle>
          <span className="text-2xl font-bold text-accent">{average}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {scores.map((score) => (
          <div key={score.label} className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{score.label}</span>
              <span className={`font-medium ${score.color}`}>{score.value}%</span>
            </div>
            <Progress value={score.value} />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
