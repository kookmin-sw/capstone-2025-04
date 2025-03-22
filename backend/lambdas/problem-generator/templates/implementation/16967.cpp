// BOJ - 16967 배열 복원하기

#include <bits/stdc++.h>
#define loop(i, s, n) for(int i = s; i <= n; i++)
#define LOOP(i, s, n) for(int i = s; i < n; i++)
 
using namespace std;
int h, w, x, y; 
int isRange(int p, int q) {
    return (1 + x) <= p && p <= (1 + h) && (1 + y) <= q && q <= (1 + w);
}
int main() {
    ios::sync_with_stdio(false); cin.tie(0);
    
    cin >> h >> w >> x >> y;
    int b[h + x + 1][w + y + 1] = {0, }, a[h + 1][w + 1] = {0, };
    loop(i, 1, h + x) loop(j, 1, w + y) cin >> b[i][j];
    loop(i, 1, h) { loop(j, 1, w)
        if(isRange(i, j)) cout << (a[i][j] = b[i][j] - a[i - x][j - y]) << ' ';
        else cout << (a[i][j] = b[i][j]) << ' ';
        cout << '\n';
    }
}