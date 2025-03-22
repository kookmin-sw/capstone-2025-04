// BOJ - 20500 Ezreal 여눈부터 가네 ㅈㅈ

#include <bits/stdc++.h>
#define loop(i, s, n) for(int i = s; i <= n; i++)
#define LOOP(i, s, n) for(int i = s; i < n; i++)
#define mod 1000000007LL
#define ll long long int
 
using namespace std;

ll md(ll k, ll m) { return k >= m ? k % m : k; }
int main() {
    ll n; cin >> n;
    ll arr[n + 1] = {0, 0, 1, 1, };
    for(ll i = 4; i <= n; i++) arr[i] = md(arr[i - 1] + 2 * arr[i - 2], mod);

    cout << arr[n] << '\n';
}