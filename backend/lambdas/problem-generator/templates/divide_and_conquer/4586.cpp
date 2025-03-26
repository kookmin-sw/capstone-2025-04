// BOJ - 4586 Image Compression

#include <bits/stdc++.h>
#define loop(i, s, n) for(int i = s; i <= n; i++)
#define LOOP(i, s, n) for(int i = s; i < n; i++)
 
using namespace std;
int w, t, arr[65][65] = {0, }, aft[65][65] = {0, }, tc = 0;
int dx[4] = {0, 0, 1, 1};
int dy[4] = {0, 1, 0, 1};
void solve(int x, int y, int d) {
    int active = 0;
    LOOP(i, x, x + d) LOOP(j, y, y + d) active += arr[i][j];
    if(active * 100 >= t * d * d) {
        LOOP(i, x, x + d) LOOP(j, y, y + d) aft[i][j] = 1;
        return;
    }
    else if((d * d - active) * 100 >= t * d * d) {
        LOOP(i, x, x + d) LOOP(j, y, y + d) aft[i][j] = 0;
        return;
    }
    LOOP(i, 0, 4) {
        int nx = x + dx[i] * (d / 2), ny = y + dy[i] * (d / 2);
        if(d != 1) solve(nx, ny, d / 2);
    }
}
int main() {
    ios::sync_with_stdio(false); cin.tie(0);
    
    while(++tc) {
        memset(arr, 0, sizeof(arr)); // 이 문제에서는 없어도 됨
        memset(arr, 0, sizeof(aft));
        cin >> w;
        if(!w) return 0; cin >> t;
        loop(i, 1, w) {
            string ss; cin >> ss;
            loop(j, 1, w) arr[i][j] = ss[j - 1] - '0';
        }
        solve(1, 1, w);
        cout << "Image " << tc << ":\n";
        loop(i, 1, w) {
            loop(j, 1, w) cout << aft[i][j];
            cout << '\n';
        }
    }
}