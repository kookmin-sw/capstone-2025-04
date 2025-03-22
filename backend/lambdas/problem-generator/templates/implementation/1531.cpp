// BOJ - 1531 투명

#include <bits/stdc++.h>
#define loop(i, s, n) for(int i = s; i <= n; i++)
#define LOOP(i, s, n) for(int i = s; i < n; i++)
 
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(0);
    
    int n, m, arr[101][101] = {0, };
    cin >> n >> m;
    loop(i, 1, n) {
        int x1, y1, x2, y2; cin >> x1 >> y1 >> x2 >> y2;
        loop(x, x1, x2) loop(y, y1, y2) arr[x][y]++;
    }

    int res = 0;
    loop(i, 1, 100) loop(j, 1, 100) if(arr[i][j] > m) res++;
    cout << res << '\n';
}