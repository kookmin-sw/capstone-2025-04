// BOJ - 5014 스타트링크

#include <bits/stdc++.h>
#define loop(i, s, n) for(int i = s; i <= n; i++)
#define LOOP(i, s, n) for(int i = s; i < n; i++)
#define MAXN 1000001
 
using namespace std;
int f, s, g, u, d, v[MAXN] = {0, }; 
int isRange(int k) {
    return 1 <= k && k <= f;
}
void bfs() {
    queue<int> q; q.push(s); v[s] = 1;
    while(!q.empty()) {
        int t = q.front(); q.pop();
        if(t == g) return;
        if(isRange(t + u) && !v[t + u]) v[t + u] = v[t] + 1, q.push(t + u);
        if(isRange(t - d) && !v[t - d]) v[t - d] = v[t] + 1, q.push(t - d);
    }
}
int main() {
    ios::sync_with_stdio(false); cin.tie(0);
    cin >> f >> s >> g >> u >> d;
    bfs();
    if(v[g] != 0) cout << v[g] - 1 << '\n';
    else cout << "use the stairs\n";
}