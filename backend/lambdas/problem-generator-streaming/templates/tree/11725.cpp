// BOJ - 11725 트리의 부모 찾기

#include <bits/stdc++.h>
#define loop(i, s, n) for(int i = s; i <= n; i++)
#define LOOP(i, s, n) for(int i = s; i < n; i++)
#define ll long long int
#define MAXN 100001
 
using namespace std;

vector<int> arr[MAXN]; int n;
void bfs() {
    int parent[MAXN] = {0, }; // visited array application
    queue<int> q; q.push(1);
    while(!q.empty()) {
        int t = q.front(); q.pop();
        for(int v : arr[t]) {
            if(parent[v]) continue;
            parent[v] = t; q.push(v);
        }
    }

    loop(i, 2, n) cout << parent[i] << '\n';
}
int main() {
    ios::sync_with_stdio(false); cin.tie(0);
    
    cin >> n;
    loop(i, 1, n - 1) {
        int s, t; cin >> s >> t;
        arr[s].push_back(t);
        arr[t].push_back(s);
    }

    bfs();
}