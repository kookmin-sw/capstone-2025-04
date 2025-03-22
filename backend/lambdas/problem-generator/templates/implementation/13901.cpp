// BOJ - 13901 로봇

#include <bits/stdc++.h>
#define loop(i, s, n) for(int i = s; i <= n; i++)
#define LOOP(i, s, n) for(int i = s; i < n; i++)
 
using namespace std;

int r, c, arr[1000][1000] = {0, };
int isRange(int x, int y) {
    return 0 <= x && x < r && 0 <= y && y < c;
}
int dx[5] = {0, -1, 1, 0, 0};
int dy[5] = {0, 0, 0, -1, 1};
int main() {
    ios::sync_with_stdio(false); cin.tie(0);
    
    cin >> r >> c;
    int k; cin >> k;
    loop(i, 1, k) {
        int x, y; cin >> x >> y;
        arr[x][y] = 1;
    }
    int sx, sy; cin >> sx >> sy; arr[sx][sy] = 1;
    int dir[4]; loop(i, 0, 3) cin >> dir[i];
    while(1) {
        int moved = 0;
        for(int i : dir) {
            int nx = sx + dx[i], ny = sy + dy[i];
            
            while(isRange(nx, ny) && !arr[nx][ny]) {
                arr[nx][ny] = 1; moved = 1;
                sx = nx; sy = ny; nx += dx[i]; ny += dy[i];
            }
        }
        if(!moved) break;
    }
    cout << sx << ' ' << sy << '\n';
}