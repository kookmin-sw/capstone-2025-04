// BOJ - 1240 노드사이의 거리

// all pairs of shortest path in tree

#include <bits/stdc++.h>
#define loop(i, s, n) for(int i = s; i <= n; i++)
#define LOOP(i, s, n) for(int i = s; i < n; i++)
#define ll long long int
#define MAXN 1001
#define INF 0x7FFFFFFFFFFFLL
 
using namespace std;

ll arr[MAXN][MAXN] = {0, }, n, m;
int main() {
    ios::sync_with_stdio(false); cin.tie(0);
    
    LOOP(i, 0, MAXN) LOOP(j, 0, MAXN) arr[i][j] = INF;
    LOOP(i, 0, MAXN) arr[i][i] = 0;
    cin >> n >> m;
    loop(i, 1, n - 1) {
        ll s, t, c; cin >> s >> t >> c;
        arr[s][t] = arr[t][s] = c;
    }

    loop(k, 1, n) loop(i, 1, n) loop(j, 1, n)
        if(arr[i][j] > arr[i][k] + arr[k][j])
            arr[i][j] = arr[i][k] + arr[k][j];

    while(m--) {
        int s, t; cin >> s >> t;
        cout << arr[s][t] << '\n';
    }
}