// BOJ - 18290 NM과 K (1)

// k <= 4 이기 때문에, brute force와 backtracking으로 해결할 수 있습니다.
// k가 더 커진다면, dp + bitmasking 으로 해결할 수 있습니다.

#include <bits/stdc++.h>
#define loop(i, s, n) for(int i = s; i <= n; i++)
#define LOOP(i, s, n) for(int i = s; i < n; i++)
 
using namespace std;
int n, m, k, k0 = 0, add = 0;
int arr[11][11] = {0, }, banned[11][11] = {0, };
int dx[4] = {0, 0, -1, 1};
int dy[4] = {-1, 1, 0, 0};
int isRange(int x, int y) {
    return 1 <= x && x <= n && 1 <= y && y <= m;
}
int dfs(int x, int y) {
    if(k0 == k) return add;
    if(!isRange(x, y)) return -0x7FFFFFF;
    int nx, ny, ans = -0x7FFFFFF;
    if(y == m) ny = 1, nx = x + 1;
    else ny = y + 1, nx = x;
    if(banned[x][y]) return dfs(nx, ny);
    if(k0 < k) {
        k0++;
        banned[x][y] = 1; LOOP(i, 0, 4) banned[x + dx[i]][y + dy[i]] += 1; add += arr[x][y];
        //cout << "k0: " << k0 << ", x: " << x << ", y: " << y << " " << add << " Active \n";
        ans = max(ans, dfs(nx, ny));
        //cout << "k0: " << k0 << ", x: " << x << ", y: " << y << " " << add << " Non-Active \n";
        k0--;
        banned[x][y] = 0; LOOP(i, 0, 4) banned[x + dx[i]][y + dy[i]] -= 1; add -= arr[x][y];
    }
    ans = max(ans, dfs(nx, ny));
    return ans;
}
int main() {
    ios::sync_with_stdio(false); cin.tie(0);
    
    cin >> n >> m >> k;
    loop(i, 1, n) loop(j, 1, m) cin >> arr[i][j];

    cout << dfs(1, 1) << '\n';
}