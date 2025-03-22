// BOJ - 12981 공 포장하기

// 이 문제에서는 1 1 0 / 1 0 1 / 0 1 1 예외 케이스를 잘 다뤄야 하는 문제이다.

#include <bits/stdc++.h>
#define loop(i, s, n) for(int i = s; i <= n; i++)
#define LOOP(i, s, n) for(int i = s; i < n; i++)
 
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(0);
    
    int r, g, b, ans = 0; cin >> r >> g >> b;
    int m = min(min(r, g), b); ans += m;
    r -= m, g -= m, b -= m;

    ans += (r / 3); r %= 3;
    ans += (b / 3); b %= 3;
    ans += (g / 3); g %= 3;

    if(r == 1 && b == 1) r--, b--, ans++;
    if(r == 1 && g == 1) r--, g--, ans++;
    if(b == 1 && g == 1) b--, g--, ans++;
    ans += (r > 0) + (b > 0) + (g > 0);

    cout << ans << '\n';
}