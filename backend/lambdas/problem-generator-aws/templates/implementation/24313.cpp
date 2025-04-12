// BOJ - 24313 알고리즘 수업 - 점근적 표기 1

#include <bits/stdc++.h>
#define loop(i, s, n) for(int i = s; i <= n; i++)
#define LOOP(i, s, n) for(int i = s; i < n; i++)
 
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(0);
    
    int a1, a0, c, n0; cin >> a1 >> a0 >> c >> n0;
    // f(n) = a1 * n + a0, g(n) = n
    // n >= n0, f(n) <= c * g(n) = c * n

    cout << (a1 * n0 + a0 <= c * n0 && a1 <= c) << '\n';
}